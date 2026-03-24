import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) return null;
  return session;
}

const patchSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  adminNotes: z.string().max(1000).optional().nullable(),
});

// ── GET /api/admin/api-access-requests/:id ───────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;
  const record = await prisma.apiAccessRequest.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  return NextResponse.json(record);
}

// ── PATCH /api/admin/api-access-requests/:id ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed.', details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.apiAccessRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const updated = await prisma.apiAccessRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes ?? null,
    },
  });

  return NextResponse.json(updated);
}
