import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import prisma from '@/lib/prisma';
import { getCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/analytics
 *
 * Aggregated summary statistics for farmers and farms.
 * Responses are cached for 10 minutes.
 * No personally identifiable fields are included.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'analytics:read');
  if (auth instanceof NextResponse) return auth;

  const data = await getCached('v1:analytics:summary', 600, async () => {
    const [
      totalFarmers,
      totalFarms,
      totalClusters,
      farmAgg,
      byState,
      byGender,
      byStatus,
      topCrops,
      bySeason,
    ] = await Promise.all([
      prisma.farmer.count(),
      prisma.farm.count(),
      prisma.cluster.count(),
      prisma.farm.aggregate({
        _sum: { farmSize: true, farmArea: true },
        _avg: { farmSize: true },
      }),
      prisma.farmer.groupBy({
        by: ['state'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 37,
      }),
      prisma.farmer.groupBy({
        by: ['gender'],
        _count: { id: true },
      }),
      prisma.farmer.groupBy({
        by: ['status'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.farm.groupBy({
        by: ['primaryCrop'],
        _count: { id: true },
        where: { primaryCrop: { not: null } },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      prisma.farm.groupBy({
        by: ['farmingSeason'],
        _count: { id: true },
        where: { farmingSeason: { not: null } },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return {
      summary: {
        totalFarmers,
        totalFarms,
        totalClusters,
        totalFarmAreaHectares: farmAgg._sum.farmSize ?? 0,
        averageFarmSizeHectares: farmAgg._avg.farmSize ?? 0,
      },
      farmersByState: byState.map((r) => ({
        state: r.state ?? 'Unknown',
        count: r._count.id,
      })),
      farmersByGender: byGender.map((r) => ({
        gender: r.gender ?? 'Unknown',
        count: r._count.id,
      })),
      farmersByStatus: byStatus.map((r) => ({
        status: r.status ?? 'Unknown',
        count: r._count.id,
      })),
      topCrops: topCrops.map((r) => ({
        crop: r.primaryCrop ?? 'Unknown',
        farmCount: r._count.id,
      })),
      farmsBySeaon: bySeason.map((r) => ({
        season: r.farmingSeason ?? 'Unknown',
        farmCount: r._count.id,
      })),
    };
  });

  return NextResponse.json({ data });
}
