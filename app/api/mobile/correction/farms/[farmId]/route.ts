import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

/**
 * Editable farm fields — id, farmerId, timestamps excluded (primary/foreign keys)
 */
const EDITABLE_FARM_FIELDS = new Set([
  'farmSize', 'primaryCrop', 'secondaryCrop', 'produceCategory',
  'farmOwnership', 'farmState', 'farmLocalGovernment', 'farmingSeason',
  'farmWard', 'farmPollingUnit', 'farmingExperience',
  'farmLatitude', 'farmLongitude', 'soilType', 'soilPH', 'soilFertility',
  'farmArea', 'farmElevation', 'year', 'yieldSeason', 'crop',
  'quantity', 'cropVariety', 'landforms',
]);

// ─── GET /api/mobile/correction/farms/[farmId] ────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> },
) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { farmId } = await params;

  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  return NextResponse.json(farm);
}

// ─── PATCH /api/mobile/correction/farms/[farmId] ──────────────────────────────
// Creates a pending DataCorrection with correctionType = "FARM"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ farmId: string }> },
) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { farmId } = await params;

  const existing = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!existing) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Strip non-editable fields
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (EDITABLE_FARM_FIELDS.has(key)) {
      sanitized[key] = value === '' ? null : value;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  // Build diff — only record fields that actually changed
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, newVal] of Object.entries(sanitized)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    const oldStr = Array.isArray(oldVal) ? JSON.stringify(oldVal) : String(oldVal ?? '');
    const newStr = Array.isArray(newVal) ? JSON.stringify(newVal) : String(newVal ?? '');
    if (oldStr !== newStr) {
      changes[key] = { from: oldVal ?? null, to: newVal ?? null };
    }
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: 'No fields changed' }, { status: 400 });
  }

  const correction = await prisma.dataCorrection.create({
    data: {
      farmerId:       existing.farmerId,
      farmId,
      correctionType: 'FARM',
      submittedBy:    user.id,
      changes: changes as any,
    },
  });

  return NextResponse.json(
    { pending: true, correctionId: correction.id, message: 'Farm correction submitted for admin review' },
    { status: 202 },
  );
}
