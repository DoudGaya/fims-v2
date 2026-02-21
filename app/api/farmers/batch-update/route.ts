import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import ProductionLogger from '@/lib/productionLogger';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.FARMERS_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { farmerIds, status } = body;

    // Validate input
    if (!farmerIds || !Array.isArray(farmerIds) || farmerIds.length === 0) {
      return NextResponse.json({ error: 'farmerIds must be a non-empty array' }, { status: 400 });
    }

    if (!status || typeof status !== 'string') {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // Validate status value
    const validStatuses = ['Enrolled', 'FarmCaptured', 'Validated', 'Verified', 'Rejected', 'Pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Update all farmers in a transaction
    const result = await prisma.farmer.updateMany({
      where: {
        id: {
          in: farmerIds
        }
      },
      data: {
        status
      }
    });

    ProductionLogger.info(`Batch update: ${result.count} farmers updated to status ${status} by ${session.user.email}`);

    return NextResponse.json({
      message: 'Farmers updated successfully',
      count: result.count,
      status
    });

  } catch (error) {
    console.error('Error in batch update:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
