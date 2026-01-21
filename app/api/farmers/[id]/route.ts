import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { farmerSchema } from '@/lib/validation';
import { PERMISSIONS } from '@/lib/permissions';
import ProductionLogger from '@/lib/productionLogger';

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

    const data = validationResult.data;

    // Check if farmer exists
    const existingFarmer = await prisma.farmer.findUnique({
      where: { id }
    });

    if (!existingFarmer) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // Check for duplicate NIN or Phone if they are being updated
    if (data.nin || data.phone) {
      const duplicateCheck = await prisma.farmer.findFirst({
        where: {
          OR: [
            data.nin ? { nin: data.nin } : {},
            data.phone ? { phone: data.phone } : {}
          ],
          NOT: { id }
        }
      });

      if (duplicateCheck) {
        if (data.nin && duplicateCheck.nin === data.nin) {
          return NextResponse.json({ error: 'Another farmer with this NIN already exists' }, { status: 409 });
        }
        if (data.phone && duplicateCheck.phone === data.phone) {
          return NextResponse.json({ error: 'Another farmer with this phone number already exists' }, { status: 409 });
        }
      }
    }

    const updatedFarmer = await prisma.farmer.update({
      where: { id },
      data: {
        ...data,
        // Don't allow updating critical fields like farmerId or registeredBy unless necessary
      }
    });

    ProductionLogger.info(`Farmer updated: ${id} by ${session.user.email}`);

    return NextResponse.json(updatedFarmer);

  } catch (error) {
    console.error('Error updating farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    return NextResponse.json({ message: 'Farmer deleted successfully' });

  } catch (error) {
    console.error('Error deleting farmer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
