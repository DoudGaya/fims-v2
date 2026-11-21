import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { getCached, cacheKey } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authResult = await getMobileUser(req);
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    const roleError = requireRole(
      user,
      'agent',
      'household_agent',
      'field_agent',
      'data_correction_agent',
      'survey_agent',
      'admin',
      'manager'
    );
    if (roleError) return roleError;

    const key = cacheKey('mobile:analytics', { userId: user.id });

    const analytics = await getCached(key, 60, async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

      const isScoped = user.role !== 'admin' && user.role !== 'manager';
      const farmerWhere = isScoped ? { agentId: user.id } : {};
      const householdWhere = isScoped ? { agentId: user.id } : {};

      const [
        totalFarmers,
        todayFarmers,
        weekFarmers,
        monthFarmers,
        totalHouseholds,
        todayHouseholds,
        weekHouseholds,
        monthHouseholds,
        genderGroupsRaw,
        recentHouseholds,
        recentFarmers,
      ] = await Promise.all([
        prisma.farmer.count({ where: farmerWhere }),
        prisma.farmer.count({ where: { ...farmerWhere, createdAt: { gte: startOfToday } } }),
        prisma.farmer.count({ where: { ...farmerWhere, createdAt: { gte: startOfWeek } } }),
        prisma.farmer.count({ where: { ...farmerWhere, createdAt: { gte: startOfMonth } } }),

        prisma.household.count({ where: householdWhere }),
        prisma.household.count({ where: { ...householdWhere, createdAt: { gte: startOfToday } } }),
        prisma.household.count({ where: { ...householdWhere, createdAt: { gte: startOfWeek } } }),
        prisma.household.count({ where: { ...householdWhere, createdAt: { gte: startOfMonth } } }),

        prisma.farmer.groupBy({
          by: ['gender'],
          where: farmerWhere,
          _count: { id: true },
        }),

        prisma.household.findMany({
          where: householdWhere,
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            houseNumber: true,
            headFirstName: true,
            headLastName: true,
            createdAt: true,
            state: true,
            lga: true,
          },
        }),

        prisma.farmer.findMany({
          where: farmerWhere,
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nin: true,
            createdAt: true,
            state: true,
            lga: true,
          },
        }),
      ]);

      const genderDistribution: Record<string, number> = {};
      genderGroupsRaw.forEach((g) => {
        const key = (g.gender || 'Unknown').toLowerCase();
        genderDistribution[key] = g._count.id;
      });

      return {
        agent: {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          role: user.role,
        },
        overview: {
          totalEnrollments: totalFarmers + totalHouseholds,
          totalFarmers,
          totalHouseholds,
          todayTotal: todayFarmers + todayHouseholds,
          todayFarmers,
          todayHouseholds,
          thisWeekTotal: weekFarmers + weekHouseholds,
          thisMonthTotal: monthFarmers + monthHouseholds,
        },
        genderDistribution,
        recentActivity: [
          ...recentHouseholds.map((h) => ({
            id: h.id,
            type: 'household' as const,
            title: `${h.headFirstName} ${h.headLastName}`,
            subtitle: h.houseNumber,
            location: `${h.lga}, ${h.state}`,
            timestamp: h.createdAt,
          })),
          ...recentFarmers.map((f) => ({
            id: f.id,
            type: 'farmer' as const,
            title: `${f.firstName} ${f.lastName}`,
            subtitle: f.nin ? `NIN: ${f.nin}` : 'Farmer',
            location: `${f.lga}, ${f.state}`,
            timestamp: f.createdAt,
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8),
      };
    });

    return NextResponse.json(analytics);
  } catch (error: any) {
    console.error('Error in GET /api/mobile/analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
