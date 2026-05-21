import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import prisma from '@/lib/prisma';

/** Prisma expects full ISO-8601 DateTime strings, but corrections stored from
 *  the mobile app may contain date-only values like "1997-10-18".
 *  This helper converts any YYYY-MM-DD string to a proper Date object. */
function normalizeDates(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      result[key] = new Date(value + 'T00:00:00.000Z');
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── PATCH /api/corrections/[id] ──────────────────────────────────────────────
// Approve or reject a pending DataCorrection.
// Body: { action: 'approve' | 'reject', adminNotes?: string }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canUpdate = await hasPermission(session.user.id, PERMISSIONS.CORRECTIONS_READ);
  if (!canUpdate) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  let body: { action?: string; adminNotes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, adminNotes } = body;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
  }

  const correction = await prisma.dataCorrection.findUnique({
    where: { id },
    include: {
      farmer: { select: { id: true } },
      farm:   { select: { id: true } },
    },
  });

  if (!correction) {
    return NextResponse.json({ error: 'Correction not found' }, { status: 404 });
  }
  if (correction.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Correction is already ${correction.status.toLowerCase()}` },
      { status: 409 },
    );
  }

  const now = new Date();
  const reviewerId = session.user.id;

  if (action === 'approve') {
    const correctionType = (correction as any).correctionType ?? 'FARMER';
    const changes = correction.changes as Record<string, { from: unknown; to: unknown }>;

    if (correctionType === 'FARM') {
      // Apply diff to the Farm row
      if (!correction.farmId) {
        return NextResponse.json({ error: 'Farm correction missing farmId' }, { status: 400 });
      }
      const newValues: Record<string, unknown> = {};
      const oldValues: Record<string, unknown> = {};
      for (const [field, diff] of Object.entries(changes)) {
        newValues[field] = diff.to;
        oldValues[field] = diff.from;
      }

      await prisma.$transaction([
        prisma.farm.update({ where: { id: correction.farmId }, data: normalizeDates(newValues) }),
        prisma.auditLog.create({
          data: {
            action: 'CORRECTION', tableName: 'farms', recordId: correction.farmId,
            oldValues: oldValues as object, newValues: newValues as object, userId: reviewerId,
          },
        }),
        prisma.dataCorrection.update({
          where: { id },
          data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: now, adminNotes: adminNotes ?? null },
        }),
      ]);

      return NextResponse.json({ success: true, status: 'APPROVED' });
    }

    if (correctionType === 'REFEREE') {
      // Changes format: { "ops": [{ "type": "add"|"update"|"delete", "refereeId"?: "...", ...fields }] }
      const ops = (changes as unknown as { ops: Array<{ type: string; refereeId?: string; [k: string]: unknown }> }).ops ?? [];
      await prisma.$transaction(async (tx) => {
        for (const op of ops) {
          if (op.type === 'add') {
            await tx.referee.create({
              data: {
                farmerId:     correction.farmerId,
                firstName:    op.firstName as string,
                lastName:     op.lastName as string,
                phone:        op.phone as string,
                relationship: op.relationship as string,
              },
            });
          } else if (op.type === 'update' && op.refereeId) {
            const { type: _t, refereeId: _r, ...fields } = op;
            await tx.referee.update({ where: { id: op.refereeId }, data: fields });
          } else if (op.type === 'delete' && op.refereeId) {
            await tx.referee.delete({ where: { id: op.refereeId } });
          }
        }
        await tx.auditLog.create({
          data: {
            action: 'CORRECTION', tableName: 'referees', recordId: correction.farmerId,
            oldValues: {} as object, newValues: changes as object, userId: reviewerId,
          },
        });
        await tx.dataCorrection.update({
          where: { id },
          data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: now, adminNotes: adminNotes ?? null },
        });
      });

      return NextResponse.json({ success: true, status: 'APPROVED' });
    }

    // Default: FARMER — Apply the diff to the farmer row + write audit log + mark correction APPROVED
    const newValues: Record<string, unknown> = {};
    const oldValues: Record<string, unknown> = {};
    for (const [field, diff] of Object.entries(changes)) {
      newValues[field] = diff.to;
      oldValues[field] = diff.from;
    }

    await prisma.$transaction([
      prisma.farmer.update({
        where: { id: correction.farmerId },
        data: normalizeDates(newValues),
      }),
      prisma.auditLog.create({
        data: {
          action:    'CORRECTION',
          tableName: 'farmers',
          recordId:  correction.farmerId,
          oldValues: oldValues as object,
          newValues: newValues as object,
          userId:    reviewerId,
        },
      }),
      prisma.dataCorrection.update({
        where: { id },
        data: {
          status:     'APPROVED',
          reviewedBy: reviewerId,
          reviewedAt: now,
          adminNotes: adminNotes ?? null,
        },
      }),
    ]);

    return NextResponse.json({ success: true, status: 'APPROVED' });
  }

  // Reject — only update the correction record
  await prisma.dataCorrection.update({
    where: { id },
    data: {
      status:     'REJECTED',
      reviewedBy: reviewerId,
      reviewedAt: now,
      adminNotes: adminNotes ?? null,
    },
  });

  return NextResponse.json({ success: true, status: 'REJECTED' });
}
