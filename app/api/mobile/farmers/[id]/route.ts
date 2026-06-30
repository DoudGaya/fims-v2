import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { farmerSchema } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/mobile/farmers/[id]
 * Fetch a single farmer by ID.
 * Allowed roles: agent, data_correction_agent, survey_agent, admin
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'survey_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  const farmer = await prisma.farmer.findUnique({
    where: { id },
    include: {
      cluster: true,
      farms:   true,
    },
  });

  if (!farmer) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  if (user.role === 'agent' && farmer.agentId !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json(farmer);
}

/**
 * PUT /api/mobile/farmers/[id]
 * Update a farmer record from the mobile app.
 * Allowed roles: agent, data_correction_agent, admin
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = farmerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const existing = await prisma.farmer.findUnique({ where: { id }, select: { id: true, agentId: true } });
  if (!existing) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  if (user.role === 'agent' && existing.agentId !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const {
    farmSize,
    primaryCrop,
    secondaryCrop,
    farmingExperience,
    farmLatitude,
    farmLongitude,
    farmPolygon,
    referees,
    ...farmerData
  } = parsed.data;

  const updated = await prisma.farmer.update({
    where: { id },
    data: farmerData as import('@prisma/client').Prisma.FarmerUncheckedUpdateInput,
  });

  return NextResponse.json(updated);
}
