import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { redactFarmers, buildFieldVisibilityMeta } from '@/lib/sensitive-fields';
import prisma from '@/lib/prisma';
import { getCached, cacheKey } from '@/lib/cache';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/farmers
 *
 * List paginated farmers.
 *
 * Query params:
 *   page       (default 1)
 *   limit      (default 50, max 200)
 *   search     — first/last name, phone, NIN (NIN only if allowSensitiveFields)
 *   state      — filter by state (case-insensitive)
 *   lga        — filter by LGA (case-insensitive)
 *   cluster    — filter by clusterId
 *   status     — Enrolled | FarmCaptured | Validated | Verified | Rejected
 *   startDate  — ISO date (filters registrationDate >=)
 *   endDate    — ISO date (filters registrationDate <=)
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req, 'farmers:read');
  if (auth instanceof NextResponse) return auth;

  const { allowSensitiveFields } = auth.apiKey;
  const sp = req.nextUrl.searchParams;

  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get('limit') ?? '50')));
  const skip = (page - 1) * limit;

  const search = sp.get('search') ?? '';
  const state = sp.get('state') ?? '';
  const lga = sp.get('lga') ?? '';
  const cluster = sp.get('cluster') ?? '';
  const status = sp.get('status') ?? '';
  const startDate = sp.get('startDate') ?? '';
  const endDate = sp.get('endDate') ?? '';

  const where: Prisma.FarmerWhereInput = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (state) where.state = { contains: state, mode: 'insensitive' };
  if (lga) where.lga = { contains: lga, mode: 'insensitive' };
  if (cluster) where.clusterId = cluster;
  if (status && status !== 'all') where.status = status;
  if (startDate || endDate) {
    where.registrationDate = {};
    if (startDate) where.registrationDate.gte = new Date(startDate);
    if (endDate) where.registrationDate.lte = new Date(endDate);
  }

  const key = cacheKey(`v1:farmers:${allowSensitiveFields ? 's' : 'r'}`, {
    page, limit, search, state, lga, cluster, status, startDate, endDate,
  });

  const { farmers, total } = await getCached(key, 120, async () => {
    const [rows, count] = await Promise.all([
      prisma.farmer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registrationDate: 'desc' },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
          state: true,
          lga: true,
          ward: true,
          pollingUnit: true,
          address: true,
          maritalStatus: true,
          employmentStatus: true,
          status: true,
          registrationDate: true,
          // identity
          nin: true,
          // financial
          bvn: true,
          bankName: true,
          accountNumber: true,
          accountName: true,
          // contact
          phone: true,
          email: true,
          whatsAppNumber: true,
          // relations
          clusterId: true,
          cluster: { select: { id: true, title: true } },
          _count: { select: { farms: true } },
        },
      }),
      prisma.farmer.count({ where }),
    ]);
    return { farmers: rows, total: count };
  });

  const safeData = redactFarmers(farmers as any[], allowSensitiveFields);

  return NextResponse.json({
    data: safeData,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    meta: buildFieldVisibilityMeta(allowSensitiveFields),
  });
}
