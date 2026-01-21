import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for updates - all fields optional
const farmUpdateSchema = z.object({
  farmSize: z.number().optional().nullable(),
  primaryCrop: z.string().optional(),
  secondaryCrop: z.union([z.string(), z.array(z.string())]).optional().nullable().transform(val => {
    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return val;
  }),
  produceCategory: z.string().optional().nullable(),
  farmOwnership: z.string().optional(),
  farmState: z.string().optional(),
  farmLocalGovernment: z.string().optional(),
  farmingSeason: z.string().optional(),
  farmWard: z.string().optional(),
  farmPollingUnit: z.string().optional(),
  farmingExperience: z.number().int().optional().nullable(),
  farmLatitude: z.number().optional().nullable(),
  farmLongitude: z.number().optional().nullable(),
  farmPolygon: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    timestamp: z.number().optional().nullable(),
    accuracy: z.number().optional().nullable()
  })).optional().nullable(),
  soilType: z.string().optional().nullable(),
  soilPH: z.number().optional().nullable(),
  soilFertility: z.string().optional().nullable(),
  farmCoordinates: z.any().optional().nullable(),
  coordinateSystem: z.string().optional(),
  farmArea: z.number().optional().nullable(),
  farmElevation: z.number().optional().nullable(),
  year: z.number().optional().nullable(),
  yieldSeason: z.string().optional().nullable(),
  crop: z.string().optional().nullable(),
  quantity: z.number().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const farm = await prisma.farm.findUnique({
      where: { id },
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

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    return NextResponse.json({ farm });
  } catch (error) {
    console.error('Error fetching farm:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farm' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Remove fields that shouldn't be updated
    delete body.farmerId;
    delete body.id;
    delete body.createdAt;
    delete body.updatedAt;

    const validation = farmUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if farm exists
    const existingFarm = await prisma.farm.findUnique({
      where: { id }
    });

    if (!existingFarm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farm = await prisma.farm.update({
      where: { id },
      data: {
        ...data,
        secondaryCrop: data.secondaryCrop === null ? undefined : data.secondaryCrop,
        farmPolygon: data.farmPolygon === null ? undefined : data.farmPolygon
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

    return NextResponse.json({ farm });
  } catch (error) {
    console.error('Error updating farm:', error);
    return NextResponse.json(
      { error: 'Failed to update farm' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if farm exists
    const farm = await prisma.farm.findUnique({
      where: { id }
    });

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    await prisma.farm.delete({
      where: { id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Farm deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting farm:', error);
    return NextResponse.json(
      { error: 'Failed to delete farm' },
      { status: 500 }
    );
  }
}
