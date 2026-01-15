import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.SETTINGS_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      totalUsers,
      totalAgents,
      totalFarmers,
      totalFarms,
      totalCertificates,
      recentUsers,
      recentFarms,
      recentCertificates
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { 
          role: 'agent'
        }
      }),
      prisma.farmer.count(),
      prisma.farm.count(),
      prisma.certificate.count(),
      // Recent counts (last 7 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.farm.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.certificate.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        agents: totalAgents,
        recent: recentUsers
      },
      farmers: {
        total: totalFarmers
      },
      farms: {
        total: totalFarms,
        recent: recentFarms
      },
      certificates: {
        total: totalCertificates,
        recent: recentCertificates
      },
      system: {
        status: 'healthy',
        version: '2.0.0'
      }
    });
  } catch (error) {
    console.error('Error fetching settings stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
