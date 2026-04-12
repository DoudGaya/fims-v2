import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// ─── GET /api/corrections/audit ───────────────────────────────────────────────
// Returns AuditLog rows where action = 'CORRECTION', joined to the User model
// so the dashboard can show who made each change.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const page    = Math.max(1, parseInt(sp.get('page')   || '1'));
  const limit   = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
  const skip    = (page - 1) * limit;
  const search  = sp.get('search')?.trim()  || '';
  const agentId = sp.get('agentId')?.trim() || '';

  const where = {
    action: 'CORRECTION',
    ...(agentId ? { userId: agentId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Resolve user display names for the logs
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  // Resolve farmer names for the logs (recordId = farmer.id)
  const farmerIds = [...new Set(logs.map((l) => l.recordId).filter(Boolean))] as string[];
  const farmers = await prisma.farmer.findMany({
    where: { id: { in: farmerIds } },
    select: { id: true, firstName: true, middleName: true, lastName: true, nin: true },
  });
  const farmerMap = Object.fromEntries(farmers.map((f) => [f.id, f]));

  // Filter by agent name search if provided (after enrichment)
  let enriched = logs.map((log) => ({
    ...log,
    user: log.userId ? userMap[log.userId] ?? null : null,
    farmer: log.recordId ? farmerMap[log.recordId] ?? null : null,
  }));

  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter(
      (l) =>
        l.farmer?.firstName?.toLowerCase().includes(q) ||
        l.farmer?.lastName?.toLowerCase().includes(q) ||
        l.farmer?.nin?.toLowerCase().includes(q) ||
        l.user?.firstName?.toLowerCase().includes(q) ||
        l.user?.lastName?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q),
    );
  }

  return NextResponse.json({
    logs: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
