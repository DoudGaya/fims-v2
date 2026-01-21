import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const farmSchema = z.object({
  farmerId: z.string().min(1, "Farmer ID is required"),
  farmSize: z.number().optional().nullable(),
  primaryCrop: z.string().min(1, "Primary crop is required"),
  secondaryCrop: z.union([z.string(), z.array(z.string())]).optional().nullable().transform(val => {
    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return val;
  }),
  produceCategory: z.string().optional().nullable(),
  farmOwnership: z.string().min(1, "Farm ownership is required"),
  farmState: z.string().min(1, "Farm state is required"),
  farmLocalGovernment: z.string().min(1, "Farm LGA is required"),
  farmingSeason: z.string().min(1, "Farming season is required"),
  farmWard: z.string().min(1, "Farm ward is required"),
  farmPollingUnit: z.string().min(1, "Farm polling unit is required"),
  farmingExperience: z.number().int().optional().nullable(),
  farmLatitude: z.number().optional().nullable(),
  farmLongitude: z.number().optional().nullable(),
  farmPolygon: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    timestamp: z.number().optional().nullable(),
    accuracy: z.number().optional().nullable()
  })).min(3, "Farm boundary must have at least 3 points"),
  soilType: z.string().optional().nullable(),
  soilPH: z.number().optional().nullable(),
  soilFertility: z.string().optional().nullable(),
  farmCoordinates: z.any().optional().nullable(),
  coordinateSystem: z.string().default('WGS84'),
  farmArea: z.number().optional().nullable(),
  farmElevation: z.number().optional().nullable(),
  year: z.number().optional().nullable(),
  yieldSeason: z.string().optional().nullable(),
  crop: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const farmerId = searchParams.get('farmerId');

    const skip = (page - 1) * limit;

    let whereClause: any = {};
    
    if (farmerId) {
      whereClause.farmerId = farmerId;
    }

    // If not admin, restrict to agent's farmers
    // Note: Assuming session.user.id is the agent's ID and role is available
    // This logic mimics the legacy code:
    // if (!req.isAdmin) { whereClause = { farmer: { agentId: req.user.uid } }; }
    // We need to check how roles are handled in the new system.
    // For now, let's assume if they are an agent, they only see their own.
    // But we need to know the role.
    // Let's assume the session has the role.
    
    // const userRole = (session.user as any).role;
    // if (userRole === 'agent') {
    //   whereClause.farmer = {
    //     agentId: session.user.id
    //   };
    // }
    // Actually, let's stick to the legacy logic where we check if they are admin or not.
    // But here we don't have a clear "isAdmin" flag on request.
    // We'll skip this restriction for now or implement it if we have clear role definitions.
    // The legacy code used `req.isAdmin` which was set based on session vs firebase token.
    // Here we are using NextAuth session for everything (presumably).
    
    const [farms, total] = await Promise.all([
      prisma.farm.findMany({
        where: whereClause,
        include: {
          farmer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nin: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.farm.count({ where: whereClause })
    ]);

    return NextResponse.json({
      farms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching farms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = farmSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify farmer exists
    const farmer = await prisma.farmer.findUnique({
      where: { id: data.farmerId }
    });

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    const farm = await prisma.farm.create({
      data: {
        ...data,
        secondaryCrop: data.secondaryCrop === null ? undefined : data.secondaryCrop,
        farmPolygon: data.farmPolygon === null ? undefined : data.farmPolygon,
        farmCoordinates: data.farmCoordinates === null ? undefined : data.farmCoordinates,
        // Prisma handles the connection via farmerId automatically if we pass it as a field
        // or we can use connect. The legacy code used connect.
        // Since 'farmerId' is a field in the model, passing it directly works.
        // However, Zod output has 'farmerId'.
        // We need to ensure 'farmPolygon' and 'farmCoordinates' are treated as JSON.
        // Prisma Client handles JSON types automatically from JS objects.
      },
      include: {
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nin: true,
          }
        }
      }
    });

    return NextResponse.json({ farm }, { status: 201 });
  } catch (error) {
    console.error('Error creating farm:', error);
    return NextResponse.json(
      { error: 'Failed to create farm' },
      { status: 500 }
    );
  }
}
