import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

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
    // Allow agents to view their own attendance, or admins to view any
    const { id } = await params;
    const isSelf = (session.user as any).id === id;

    if (!isSelf && !checkPermission(userPermissions, PERMISSIONS.AGENTS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Find the Agent record for this user
    const agent = await prisma.agent.findUnique({
      where: { userId: id },
      select: { id: true }
    });

    if (!agent) {
      return NextResponse.json({
        attendanceRate: 0,
        presentDays: 0,
        totalDays: 0,
        checkIns: 0,
        checkOuts: 0
      });
    }

    // Calculate date range (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        agentId: agent.id,
        timestamp: {
          gte: thirtyDaysAgo
        }
      }
    });

    const checkIns = attendanceRecords.filter(r => r.type === 'check_in').length;
    const checkOuts = attendanceRecords.filter(r => r.type === 'check_out').length;

    // Calculate unique days present
    const uniqueDays = new Set(
      attendanceRecords.map(r => new Date(r.timestamp).toDateString())
    );
    const presentDays = uniqueDays.size;

    // Calculate working days (excluding weekends)
    let workingDays = 0;
    const current = new Date(thirtyDaysAgo);
    const today = new Date();

    while (current <= today) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // 0 is Sunday, 6 is Saturday
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    const attendanceRate = workingDays > 0
      ? Math.round((presentDays / workingDays) * 100)
      : 0;

    return NextResponse.json({
      attendanceRate,
      presentDays,
      totalDays: workingDays,
      checkIns,
      checkOuts
    });

  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
