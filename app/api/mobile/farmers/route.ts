import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { farmerSchema } from '@/lib/validation';

/**
 * GET /api/mobile/farmers
 * List / search farmers for mobile agents.
 * Allowed roles: agent, data_correction_agent, survey_agent, admin
 *
 * Query params:
 *   search, query, state, lga, ward, pollingUnit, nin, bvn, status, page, limit
 */
export async function GET(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'survey_agent', 'admin');
  if (roleError) return roleError;

  const sp = req.nextUrl.searchParams;
  const page  = Math.max(1, parseInt(sp.get('page')  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
  const skip  = (page - 1) * limit;

  const search      = sp.get('search')      || sp.get('query') || '';
  const state       = sp.get('state')       || '';
  const lga         = sp.get('lga')         || '';
  const ward        = sp.get('ward')        || '';
  const pollingUnit = sp.get('pollingUnit') || '';
  const nin         = sp.get('nin')         || '';
  const bvn         = sp.get('bvn')         || '';
  const status      = sp.get('status')      || '';

  const where: Prisma.FarmerWhereInput = {};

  if (search) {
    where.OR = [
      { firstName:  { contains: search, mode: 'insensitive' } },
      { lastName:   { contains: search, mode: 'insensitive' } },
      { middleName: { contains: search, mode: 'insensitive' } },
      { phone:      { contains: search, mode: 'insensitive' } },
      { nin:        { contains: search, mode: 'insensitive' } },
    ];
  }

  // Exact NIN lookup (direct param, no search term)
  if (nin && !search) where.nin = { equals: nin, mode: 'insensitive' };
  if (bvn && !search) where.bvn = { equals: bvn, mode: 'insensitive' };

  if (state)       where.state       = { contains: state,       mode: 'insensitive' };
  if (lga)         where.lga         = { contains: lga,         mode: 'insensitive' };
  if (ward)        where.ward        = { contains: ward,        mode: 'insensitive' };
  if (pollingUnit) where.pollingUnit = { contains: pollingUnit, mode: 'insensitive' };
  if (status && status !== 'all') where.status = status;

  const [farmers, total] = await Promise.all([
    prisma.farmer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
        createdAt:        true,
        gender:           true,
        dateOfBirth:      true,
        farms: {
          select: {
            id:           true,
            farmSize:     true,
            primaryCrop:  true,
          },
        },
      },
    }),
    prisma.farmer.count({ where }),
  ]);

  return NextResponse.json({
    farmers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/mobile/farmers
 * Create a new farmer record from the mobile enrollment app.
 * Allowed roles: agent, admin
 */
export async function POST(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'admin');
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = farmerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Duplicate check
  const existing = await prisma.farmer.findFirst({
    where: {
      OR: [
        ...(data.nin ? [{ nin: data.nin }] : []),
        { phone: data.phone },
      ],
    },
    select: { id: true, nin: true, phone: true },
  });

  if (existing) {
    if (data.nin && existing.nin === data.nin) {
      return NextResponse.json({ error: 'A farmer with this NIN already exists' }, { status: 409 });
    }
    if (existing.phone === data.phone) {
      return NextResponse.json({ error: 'A farmer with this phone number already exists' }, { status: 409 });
    }
  }

  const nin = data.nin || `GEN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

  const {
    farmSize,
    primaryCrop,
    secondaryCrop,
    farmingExperience,
    farmLatitude,
    farmLongitude,
    farmPolygon,
    ...farmerData
  } = data;

  const newFarmer = await prisma.farmer.create({
    data: {
      ...farmerData,
      nin,
      status: 'Pending',
      registrationDate: new Date(),
      agentId: user.id,
      farms: {
        create: {
          farmSize,
          primaryCrop,
          secondaryCrop: secondaryCrop ? [secondaryCrop] : [],
          farmingExperience,
          farmLatitude,
          farmLongitude,
          farmPolygon,
        },
      },
    },
  });

  return NextResponse.json(newFarmer, { status: 201 });
}
