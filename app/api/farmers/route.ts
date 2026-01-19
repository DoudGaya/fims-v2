import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
export const dynamic = "force-dynamic";
import prisma from '@/lib/prisma';
import { farmerSchema } from '@/lib/validation';
import { PERMISSIONS } from '@/lib/permissions';
import ProductionLogger from '@/lib/productionLogger';
import { Prisma } from '@prisma/client';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];

    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || '';
    const cluster = searchParams.get('cluster') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.FarmerWhereInput = {};

    if (search) {
      const searchTerms = search.trim().split(/\s+/);

      if (searchTerms.length > 1) {
        // Handle full name search (e.g., "John Doe")
        // We match if ANY combination of firstName/lastName matches the terms
        where.OR = [
          {
            AND: searchTerms.map(term => ({
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } }
              ]
            }))
          },
          // Also allow searching phone/NIN with the full string just in case
          { phone: { contains: search, mode: 'insensitive' } },
          { nin: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        // Single term search
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { nin: { contains: search, mode: 'insensitive' } },
          // { farmerId: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (cluster) {
      where.clusterId = cluster;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Execute query
    const [farmers, total] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cluster: {
            select: {
              title: true,
              // state: true // Cluster might not have state directly, check schema
            }
          },
          farms: {
            select: {
              id: true,
              farmSize: true,
              // status: true // Farm might not have status
            }
          }
        }
      }),
      prisma.farmer.count({ where })
    ]);

    return NextResponse.json({
      farmers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching farmers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];

    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_CREATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();

    // Validate input
    const validationResult = farmerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const data = validationResult.data;

    // Check for duplicate NIN or Phone
    const existingFarmer = await prisma.farmer.findFirst({
      where: {
        OR: [
          { nin: data.nin },
          { phone: data.phone }
        ]
      }
    });

    if (existingFarmer) {
      if (existingFarmer.nin === data.nin) {
        return NextResponse.json({ error: 'A farmer with this NIN already exists' }, { status: 409 });
      }
      if (existingFarmer.phone === data.phone) {
        return NextResponse.json({ error: 'A farmer with this phone number already exists' }, { status: 409 });
      }
    }

    // Generate Farmer ID (Simple implementation, can be improved)
    // Format: FIMS-{STATE_CODE}-{RANDOM}
    // For now, just use a timestamp based ID or similar if not provided
    // Legacy system might have a specific format.
    // Let's assume the database handles ID generation or we generate a simple one.
    // The schema doesn't require farmerId in input, so we should generate it.

    // const stateCode = data.state ? data.state.substring(0, 3).toUpperCase() : 'GEN';
    // const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    // const farmerId = `FIMS-${stateCode}-${randomSuffix}`;

    const {
      farmSize,
      primaryCrop,
      secondaryCrop,
      farmingExperience,
      farmLatitude,
      farmLongitude,
      farmPolygon,
      ...farmerData
    } = data;

    const newFarmer = await prisma.farmer.create({
      data: {
        ...farmerData,
        // farmerId, // Removed as it's not in schema
        status: 'Enrolled', // Default status
        agentId: session.user.id, // Changed from registeredBy to agentId
        farms: {
          create: {
            farmSize,
            primaryCrop,
            secondaryCrop: secondaryCrop ? [secondaryCrop] : [],
            farmingExperience,
            farmLatitude,
            farmLongitude,
            farmPolygon
          }
        }
      }
    });

    ProductionLogger.info(`Farmer created: ${newFarmer.id} by ${session.user.email}`);

    return NextResponse.json(newFarmer, { status: 201 });

  } catch (error) {
    console.error('Error creating farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
