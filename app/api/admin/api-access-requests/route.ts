import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) return null;
  return session;
}

// ── GET /api/admin/api-access-requests ───────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')));
  const skip = (page - 1) * limit;
  const statusFilter = sp.get('status') ?? undefined;

  const where = statusFilter ? { status: statusFilter as any } : {};

  const [requests, total] = await Promise.all([
    prisma.apiAccessRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.apiAccessRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: requests,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
