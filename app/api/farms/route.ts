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
    const state = searchParams.get('state');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (farmerId) {
      whereClause.farmerId = farmerId;
    }

    if (state && state !== 'all') {
      whereClause.farmState = state;
    }

    if (search) {
      whereClause.farmer = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { nin: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

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
