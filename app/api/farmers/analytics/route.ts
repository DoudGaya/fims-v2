import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import ProductionLogger from '@/lib/productionLogger';
import { PERMISSIONS } from '@/lib/permissions';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    // Check for dashboard or farmers read permission
    if (!checkPermission(userPermissions, PERMISSIONS.DASHBOARD_ACCESS) && !checkPermission(userPermissions, 'farmers.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    ProductionLogger.info('Fetching farmers analytics data');

    // Get total farmers count
    const totalFarmers = await prisma.farmer.count();

    // Get farmers by state
    const farmersByStateRaw = await prisma.farmer.groupBy({
      by: ['state'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Process and normalize state data
    const stateMap = new Map();

    farmersByStateRaw.forEach(item => {
      if (!item.state || item.state.trim() === '') return;

      const normalizedState = item.state.trim().toUpperCase();
      const currentCount = stateMap.get(normalizedState) || 0;
      stateMap.set(normalizedState, currentCount + item._count.id);
    });

    // Convert back to array and sort
    const farmersByState = Array.from(stateMap.entries())
      .map(([state, count]) => ({
        state: state.charAt(0) + state.slice(1).toLowerCase(), // Title Case for display
        _count: { id: count }
      }))
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 10);

    // Get farmers by status
    const farmersByStatusRaw = await prisma.farmer.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const farmersByStatus = farmersByStatusRaw.reduce((acc, curr) => {
      acc[curr.status || 'Pending'] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get farmers by gender
    const farmersByGender = await prisma.farmer.groupBy({
      by: ['gender'],
      _count: {
        id: true
      }
    });

    // Get recent registrations
    const recentRegistrations = await prisma.farmer.findMany({
      take: 5,
      orderBy: {
        registrationDate: 'desc'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        state: true,
        registrationDate: true
      }
    });

    return NextResponse.json({
      totalFarmers,
      farmersByState,
      farmersByStatus,
      farmersByGender,
      recentRegistrations
    });

  } catch (error: any) {
    ProductionLogger.error('Farmers analytics error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
