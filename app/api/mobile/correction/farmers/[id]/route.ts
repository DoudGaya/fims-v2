import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

/**
 * Fields a Data Correction Agent is permitted to update.
 * NIN is intentionally excluded — it is a permanent identity key.
 */
const EDITABLE_FIELDS = new Set([
  'firstName', 'middleName', 'lastName',
  'dateOfBirth', 'gender', 'maritalStatus', 'employmentStatus',
  'phone', 'email', 'whatsAppNumber',
  'address', 'state', 'lga', 'ward', 'pollingUnit',
  'bankName', 'accountNumber', 'accountName', 'bvn',
]);

// ─── GET /api/mobile/correction/farmers/[id] ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  const farmer = await prisma.farmer.findUnique({
    where: { id },
    include: { referees: true },
  });

  if (!farmer) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  return NextResponse.json(farmer);
}

// ─── PATCH /api/mobile/correction/farmers/[id] ────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  const existing = await prisma.farmer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Strip any non-editable fields (NIN, id, timestamps, etc.)
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (EDITABLE_FIELDS.has(key)) {
      sanitized[key] = value === '' ? null : value;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  // Uniqueness check: phone
  if (sanitized.phone && sanitized.phone !== existing.phone) {
    const dup = await prisma.farmer.findUnique({
      where: { phone: sanitized.phone as string },
    });
    if (dup) {
      return NextResponse.json(
        { error: 'Phone number is already registered to another farmer' },
        { status: 409 }
      );
    }
  }

  // Uniqueness check: bvn (only if changed and not null)
  if (sanitized.bvn && sanitized.bvn !== existing.bvn) {
    const dup = await prisma.farmer.findFirst({
      where: { bvn: sanitized.bvn as string, NOT: { id } },
    });
    if (dup) {
      return NextResponse.json(
        { error: 'BVN is already registered to another farmer' },
        { status: 409 }
      );
    }
  }

  // Build audit diff — record only fields that actually changed
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  for (const [key, newVal] of Object.entries(sanitized)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    if (String(oldVal ?? '') !== String(newVal ?? '')) {
      oldValues[key] = oldVal;
      newValues[key] = newVal;
    }
  }

  // Run update + audit log in a single transaction
  const [updatedFarmer] = await prisma.$transaction([
    prisma.farmer.update({ where: { id }, data: sanitized }),
    prisma.auditLog.create({
      data: {
        action:    'CORRECTION',
        tableName: 'farmers',
        recordId:  id,
        oldValues: Object.keys(oldValues).length > 0 ? (oldValues as object) : undefined,
        newValues: Object.keys(newValues).length > 0 ? (newValues as object) : undefined,
        userId:    user.id,
      },
    }),
  ]);

  return NextResponse.json(updatedFarmer);
}
