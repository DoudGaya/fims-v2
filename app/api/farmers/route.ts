import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { farmerSchema } from '@/lib/validation';
import { PERMISSIONS } from '@/lib/permissions';
import ProductionLogger from '@/lib/productionLogger';
import { Prisma } from '@prisma/client';
import { getCached, cacheKey, invalidateByPrefix } from '@/lib/cache';

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
    const lga = searchParams.get('lga') || '';
    const ward = searchParams.get('ward') || '';
    const pollingUnit = searchParams.get('pollingUnit') || '';
    const nin = searchParams.get('nin') || '';
    const bvn = searchParams.get('bvn') || '';

    const skip = (page - 1) * limit;

    const userRole = (session.user as any).role;
    const isAgent = userRole === 'agent';

    // Build where clause
    const where: Prisma.FarmerWhereInput = {};

    if (isAgent) {
      where.agentId = (session.user as any).id;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { nin: { contains: search, mode: 'insensitive' } },
        // { farmerId: { contains: search, mode: 'insensitive' } },
      ];
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

    if (lga) {
      where.lga = { contains: lga, mode: 'insensitive' };
    }

    if (ward) {
      where.ward = { contains: ward, mode: 'insensitive' };
    }

    if (pollingUnit) {
      where.pollingUnit = { contains: pollingUnit, mode: 'insensitive' };
    }

    if (nin) {
      where.nin = { contains: nin, mode: 'insensitive' };
    }

    if (bvn) {
      where.bvn = { contains: bvn, mode: 'insensitive' };
    }

    // Execute query — cache keyed by all filter/pagination params
    const key = cacheKey('farmers', { page, limit, search, state, cluster, status, startDate, endDate, lga, ward, pollingUnit, nin, bvn, agentId: isAgent ? (session.user as any).id : null });
    const result = await getCached(key, 300, async () => {
    const [farmers, total, stats] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          cluster: {
            select: {
              title: true,
            }
          },
          farms: {
            select: {
              id: true,
              farmSize: true,
            }
          }
        }
      }),
      prisma.farmer.count({ where }),
      // Get stats for dashboard cards
      prisma.farmer.aggregate({
        _count: { id: true },
        where: isAgent ? { agentId: (session.user as any).id } : {}
      }).then(async (result) => {
        const [verifiedCount, totalFarms, totalClusters] = await Promise.all([
          prisma.farmer.count({ where: isAgent ? { agentId: (session.user as any).id, status: 'Verified' } : { status: 'Verified' } }),
          prisma.farm.count(isAgent ? { where: { farmer: { agentId: (session.user as any).id } } } : undefined),
          prisma.cluster.count()
        ]);
        return {
          totalFarmers: result._count.id,
          verifiedFarmers: verifiedCount,
          totalFarms,
          totalClusters
        };
      })
    ]);
      return {
        farmers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      };
    });

    return NextResponse.json(result);

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

    // Check for duplicate NIN or Phone (only if NIN is provided)
    const existingFarmer = await prisma.farmer.findFirst({
      where: {
        OR: [
          data.nin ? { nin: data.nin } : { id: 'never-match' },
          { phone: data.phone }
        ]
      }
    });

    if (existingFarmer) {
      if (data.nin && existingFarmer.nin === data.nin) {
        return NextResponse.json({ error: 'A farmer with this NIN already exists' }, { status: 409 });
      }
      if (existingFarmer.phone === data.phone) {
        return NextResponse.json({ error: 'A farmer with this phone number already exists' }, { status: 409 });
      }
    }

    // Generate NIN if not provided (required by schema)
    const nin = data.nin || `GEN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

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
      referees,
      ...farmerData 
    } = data;

    const newFarmer = await prisma.farmer.create({
      data: {
        ...farmerData,
        nin, // Use generated or provided NIN
        // farmerId, // Removed as it's not in schema
        status: 'Pending', // Default status
        agentId: session.user.id, // Changed from registeredBy to agentId
        ...(referees && referees.length > 0 ? {
          referees: {
            create: referees
          }
        } : {}),
        ...((farmSize !== undefined || primaryCrop || secondaryCrop || farmingExperience !== undefined || farmLatitude !== undefined || farmLongitude !== undefined || farmPolygon) ? {
          farms: {
            create: {
              farmSize,
              primaryCrop,
              secondaryCrop: secondaryCrop
                ? (Array.isArray(secondaryCrop)
                    ? secondaryCrop
                    : secondaryCrop.split(',').map((s: string) => s.trim()).filter(Boolean))
                : [],
              farmingExperience,
              farmLatitude,
              farmLongitude,
              farmPolygon: farmPolygon || undefined,
              farmState: farmerData.state,
              farmLocalGovernment: farmerData.lga,
              farmWard: farmerData.ward,
              farmPollingUnit: farmerData.pollingUnit,
            }
          }
        } : {})
      }
    });

    ProductionLogger.info(`Farmer created: ${newFarmer.id} by ${session.user.email}`);

    // Invalidate cached farmers lists and analytics so next request fetches fresh data
    await invalidateByPrefix('fims:v1:farmers');

    return NextResponse.json(newFarmer, { status: 201 });

  } catch (error) {
    console.error('Error creating farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
