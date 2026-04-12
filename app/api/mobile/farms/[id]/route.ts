import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { z } from 'zod';

const farmUpdateSchema = z.object({
  farmSize: z.number().optional().nullable(),
  primaryCrop: z.string().optional(),
  secondaryCrop: z.union([z.string(), z.array(z.string())])
    .optional()
    .nullable()
    .transform((val) => {
      if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
      return val ?? undefined;
    }),
  produceCategory: z.string().optional(),
  farmOwnership: z.string().optional(),
  farmState: z.string().optional(),
  farmLocalGovernment: z.string().optional(),
  farmingSeason: z.string().optional(),
  farmWard: z.string().optional(),
  farmPollingUnit: z.string().optional(),
  farmingExperience: z.number().int().optional().nullable(),
  farmLatitude: z.number().optional().nullable(),
  farmLongitude: z.number().optional().nullable(),
  farmPolygon: z.any().optional().nullable(),
  farmCoordinates: z.any().optional().nullable(),
  soilType: z.string().optional(),
  soilPH: z.number().optional().nullable(),
  soilFertility: z.string().optional(),
  farmArea: z.number().optional().nullable(),
  farmElevation: z.number().optional().nullable(),
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/mobile/farms/[id]
 * Fetch a single farm. Allowed roles: agent, data_correction_agent, survey_agent, admin
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'survey_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  const farm = await prisma.farm.findUnique({ where: { id } });
  if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

  return NextResponse.json(farm);
}

/**
 * PUT /api/mobile/farms/[id]
 * Update a farm. Allowed roles: agent, data_correction_agent, admin
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

  const parsed = farmUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const existing = await prisma.farm.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

  const updated = await prisma.farm.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

/**
 * DELETE /api/mobile/farms/[id]
 * Delete a farm. Allowed roles: agent, admin
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  const existing = await prisma.farm.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

  await prisma.farm.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
