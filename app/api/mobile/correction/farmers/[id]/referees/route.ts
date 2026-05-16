import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

/**
 * POST /api/mobile/correction/farmers/[id]/referees
 * Submits a pending referee correction (add / update / delete ops).
 * Body: { ops: Array<{ type: "add"|"update"|"delete", refereeId?: string, firstName?, lastName?, phone?, relationship? }> }
 * Allowed roles: data_correction_agent, admin
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { id: farmerId } = await params;

  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId }, select: { id: true } });
  if (!farmer) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  let body: { ops?: Array<{ type: string; refereeId?: string; [k: string]: unknown }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ops = body.ops ?? [];
  if (!Array.isArray(ops) || ops.length === 0) {
    return NextResponse.json({ error: 'ops array is required and must be non-empty' }, { status: 400 });
  }

  // Basic validation per op
  for (const op of ops) {
    if (!['add', 'update', 'delete'].includes(op.type)) {
      return NextResponse.json({ error: `Unknown op type: ${op.type}` }, { status: 400 });
    }
    if ((op.type === 'update' || op.type === 'delete') && !op.refereeId) {
      return NextResponse.json({ error: `refereeId required for ${op.type} op` }, { status: 400 });
    }
    if (op.type === 'add') {
      if (!op.firstName || !op.lastName || !op.phone || !op.relationship) {
        return NextResponse.json(
          { error: 'add op requires firstName, lastName, phone, relationship' },
          { status: 400 },
        );
      }
    }
  }

  const correction = await prisma.dataCorrection.create({
    data: {
      farmerId,
      correctionType: 'REFEREE',
      submittedBy:    user.id,
      changes:        { ops },
    },
  });

  return NextResponse.json(
    { pending: true, correctionId: correction.id, message: 'Referee correction submitted for admin review' },
    { status: 202 },
  );
}
