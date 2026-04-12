import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

/**
 * GET /api/mobile/correction/farmers
 * Search / filter farmers for correction agents.
 * Allowed roles: data_correction_agent, admin
 *
 * Query params:
 *   search, state, lga, ward, pollingUnit, nin, bvn, page, limit
 */
export async function GET(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const sp = req.nextUrl.searchParams;
  const page  = Math.max(1, parseInt(sp.get('page')  || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20')));
  const skip  = (page - 1) * limit;

  const search      = sp.get('search')      || '';
  const state       = sp.get('state')       || '';
  const lga         = sp.get('lga')         || '';
  const ward        = sp.get('ward')        || '';
  const pollingUnit = sp.get('pollingUnit') || '';
  const nin         = sp.get('nin')         || '';
  const bvn         = sp.get('bvn')         || '';

  const where: Prisma.FarmerWhereInput = {};

  if (search) {
    where.OR = [
      { firstName:  { contains: search, mode: 'insensitive' } },
      { lastName:   { contains: search, mode: 'insensitive' } },
      { middleName: { contains: search, mode: 'insensitive' } },
      { phone:      { contains: search, mode: 'insensitive' } },
    ];
  }

  if (state)       where.state       = { contains: state,       mode: 'insensitive' };
  if (lga)         where.lga         = { contains: lga,         mode: 'insensitive' };
  if (ward)        where.ward        = { contains: ward,        mode: 'insensitive' };
  if (pollingUnit) where.pollingUnit = { contains: pollingUnit, mode: 'insensitive' };
  if (nin)         where.nin         = { contains: nin,         mode: 'insensitive' };
  if (bvn)         where.bvn         = { contains: bvn,         mode: 'insensitive' };

  const [farmers, total] = await Promise.all([
    prisma.farmer.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id:               true,
        nin:              true,
        firstName:        true,
        middleName:       true,
        lastName:         true,
        phone:            true,
        state:            true,
        lga:              true,
        ward:             true,
        pollingUnit:      true,
        status:           true,
        registrationDate: true,
      },
    }),
    prisma.farmer.count({ where }),
  ]);

  return NextResponse.json({
    farmers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
