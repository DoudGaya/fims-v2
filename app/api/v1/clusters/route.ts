import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import prisma from '@/lib/prisma';
import { getCached, cacheKey } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/clusters
 *
 * List all farmer clusters.
 *
 * Query params:
 *   page    (default 1)
 *   limit   (default 50, max 200)
 *   search  — filter by title (case-insensitive)
 *   active  — "true" | "false" (filter by isActive)
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'clusters:read');
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
  const skip = (page - 1) * limit;
  const search = sp.get('search') ?? '';
  const activeParam = sp.get('active');

  const where: any = {};
  if (search) where.title = { contains: search, mode: 'insensitive' };
  if (activeParam === 'true') where.isActive = true;
  if (activeParam === 'false') where.isActive = false;

  const key = cacheKey('v1:clusters', { page, limit, search, active: activeParam });

  const { clusters, total } = await getCached(key, 180, async () => {
    const [rows, count] = await Promise.all([
      prisma.cluster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          subCluster: true,
          description: true,
          clusterLeadFirstName: true,
          clusterLeadLastName: true,
          clusterLeadEmail: true,
          clusterLeadPhone: true,
          clusterLeadState: true,
          clusterLeadLGA: true,
          clusterLeadWard: true,
          clusterLeadPosition: true,
          totalFarmers: true,
          totalFarms: true,
          totalFarmSize: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.cluster.count({ where }),
    ]);
    return { clusters: rows, total: count };
  });

  return NextResponse.json({
    data: clusters,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
