import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { farmerSchema } from '@/lib/validation';
import { PERMISSIONS } from '@/lib/permissions';
import ProductionLogger from '@/lib/productionLogger';
import { invalidateByPrefix } from '@/lib/cache';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        cluster: true,
        farms: true,
        // Include other relations if needed
      }
    });

    if (!farmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    return NextResponse.json(farmer);

  } catch (error) {
    console.error('Error fetching farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Validate input (partial validation for updates?)
    // Usually we want to validate the whole object or use a partial schema.
    // For now, let's use the same schema but allow partial updates if needed, 
    // or just assume the client sends the full object.
    // Zod has .partial() method.
    const validationResult = farmerSchema.partial().safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.format() 
      }, { status: 400 });
    }

    const {
      referees,
      farmSize,
      primaryCrop,
      secondaryCrop,
      farmingExperience,
      farmLatitude,
      farmLongitude,
      farmPolygon,
      ...farmerData
    } = validationResult.data;

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id }
    });

    if (!existingFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // Check for duplicate NIN or Phone if they are being updated
    if (farmerData.nin || farmerData.phone) {
      const duplicateCheck = await prisma.farmer.findFirst({
        where: {
          OR: [
            farmerData.nin ? { nin: farmerData.nin } : {},
            farmerData.phone ? { phone: farmerData.phone } : {}
          ],
          NOT: { id }
        }
      });

      if (duplicateCheck) {
        if (farmerData.nin && duplicateCheck.nin === farmerData.nin) {
          return NextResponse.json({ error: 'Another farmer with this NIN already exists' }, { status: 409 });
        }
        if (farmerData.phone && duplicateCheck.phone === farmerData.phone) {
          return NextResponse.json({ error: 'Another farmer with this phone number already exists' }, { status: 409 });
        }
      }
    }

    // Check if farmer has an existing farm record
    const existingFarm = await prisma.farm.findFirst({
      where: { farmerId: id }
    });

    const farmFields: any = {};
    if (farmSize !== undefined) farmFields.farmSize = farmSize;
    if (primaryCrop !== undefined) farmFields.primaryCrop = primaryCrop;
    if (secondaryCrop !== undefined) {
      farmFields.secondaryCrop = Array.isArray(secondaryCrop)
        ? secondaryCrop
        : secondaryCrop.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (farmingExperience !== undefined) farmFields.farmingExperience = farmingExperience;
    if (farmLatitude !== undefined) farmFields.farmLatitude = farmLatitude;
    if (farmLongitude !== undefined) farmFields.farmLongitude = farmLongitude;
    if (farmPolygon !== undefined) farmFields.farmPolygon = farmPolygon;

    const hasFarmUpdates = Object.keys(farmFields).length > 0;

    if (hasFarmUpdates) {
      if (existingFarm) {
        await prisma.farm.update({
          where: { id: existingFarm.id },
          data: farmFields,
        });
      } else {
        await prisma.farm.create({
          data: {
            ...farmFields,
            secondaryCrop: farmFields.secondaryCrop || [],
            farmerId: id,
            farmState: farmerData.state || existingFarmer.state,
            farmLocalGovernment: farmerData.lga || existingFarmer.lga,
            farmWard: farmerData.ward || existingFarmer.ward,
            farmPollingUnit: farmerData.pollingUnit || existingFarmer.pollingUnit,
          }
        });
      }
    }

    const updatedFarmer = await prisma.farmer.update({
      where: { id },
      data: {
        ...(farmerData as import('@prisma/client').Prisma.FarmerUncheckedUpdateInput),
        ...(referees ? {
          referees: {
            deleteMany: {},
            create: referees
          }
        } : {})
      }
    });

    ProductionLogger.info(`Farmer updated: ${id} by ${session.user.email}`);

    await invalidateByPrefix('fims:v1:farmers');

    return NextResponse.json(updatedFarmer);

  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id }
    });

    if (!existingFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // For PATCH, we allow minimal updates like status
    const updatedFarmer = await prisma.farmer.update({
      where: { id },
      data: body
    });

    ProductionLogger.info(`Farmer status updated: ${id} to ${body.status} by ${session.user.email}`);

    await invalidateByPrefix('fims:v1:farmers');

    return NextResponse.json(updatedFarmer);

  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id }
    });

    if (!existingFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // Check if farmer has related records that prevent deletion (e.g. farms)
    // Prisma might handle this with cascade delete or restrict.
    // Usually safer to check.
    const farmsCount = await prisma.farm.count({
      where: { farmerId: id }
    });

    if (farmsCount > 0) {
      return NextResponse.json({ error: 'Cannot delete farmer with registered farms. Delete farms first.' }, { status: 400 });
    }

    await prisma.farmer.delete({
      where: { id }
    });

    ProductionLogger.info(`Farmer deleted: ${id} by ${session.user.email}`);

    await invalidateByPrefix('fims:v1:farmers');

    return NextResponse.json({ message: 'Farmer deleted successfully' });

  } catch (error) {
    console.error('Error deleting farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
