import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { buildFieldVisibilityMeta } from '@/lib/sensitive-fields';
import prisma from '@/lib/prisma';
import { getCached, cacheKey } from '@/lib/cache';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/farms
 *
 * List paginated farms.
 *
 * Query params:
 *   page      (default 1)
 *   limit     (default 50, max 200)
 *   farmerId  — filter by farmer ID
 *   state     — filter by farm state (case-insensitive)
 *   crop      — filter by primaryCrop (case-insensitive)
 *   season    — filter by farmingSeason
 *
 * Note: Farm polygon boundary coordinates are excluded from public API responses.
 * Farmer identity and financial fields are not included in farm listings.
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'farms:read');
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
  const skip = (page - 1) * limit;

  const farmerId = sp.get('farmerId') ?? '';
  const state = sp.get('state') ?? '';
  const crop = sp.get('crop') ?? '';
  const season = sp.get('season') ?? '';

  const where: Prisma.FarmWhereInput = {};
  if (farmerId) where.farmerId = farmerId;
  if (state) where.farmState = { contains: state, mode: 'insensitive' };
  if (crop) where.primaryCrop = { contains: crop, mode: 'insensitive' };
  if (season) where.farmingSeason = { contains: season, mode: 'insensitive' };

  const key = cacheKey('v1:farms', { page, limit, farmerId, state, crop, season });

  const { farms, total } = await getCached(key, 120, async () => {
    const [rows, count] = await Promise.all([
      prisma.farm.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          farmSize: true,
          primaryCrop: true,
          secondaryCrop: true,
          produceCategory: true,
          farmOwnership: true,
          farmState: true,
          farmLocalGovernment: true,
          farmingSeason: true,
          farmWard: true,
          farmPollingUnit: true,
          farmingExperience: true,
          farmLatitude: true,
          farmLongitude: true,
          soilType: true,
          soilPH: true,
          soilFertility: true,
          farmArea: true,
          farmElevation: true,
          coordinateSystem: true,
          year: true,
          yieldSeason: true,
          crop: true,
          quantity: true,
          cropVariety: true,
          landforms: true,
          createdAt: true,
          // farmPolygon and farmCoordinates excluded — too granular
          farmer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              state: true,
              lga: true,
              status: true,
            },
          },
        },
      }),
      prisma.farm.count({ where }),
    ]);
    return { farms: rows, total: count };
  });

  return NextResponse.json({
    data: farms,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    meta: buildFieldVisibilityMeta(false),
  });
}
