import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/api-keys/:id/usage
 *
 * Returns usage statistics and the last 50 request logs for a specific API key.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) {
    return NextResponse.json({ error: 'Forbidden: system.manage_integrations permission required.' }, { status: 403 });
  }

  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      requestCount: true,
      lastUsedAt: true,
      rateLimit: true,
      isActive: true,
    },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50')));

  const logs = await prisma.apiKeyUsageLog.findMany({
    where: { apiKeyId: id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      endpoint: true,
      method: true,
      statusCode: true,
      ipAddress: true,
      createdAt: true,
    },
  });

  // Endpoint breakdown — top 10
  const endpointBreakdown = await prisma.apiKeyUsageLog.groupBy({
    by: ['endpoint'],
    where: { apiKeyId: id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  // Status code summary
  const statusBreakdown = await prisma.apiKeyUsageLog.groupBy({
    by: ['statusCode'],
    where: { apiKeyId: id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return NextResponse.json({
    data: {
      key: apiKey,
      stats: {
        totalRequests: Number(apiKey.requestCount),
        lastUsedAt: apiKey.lastUsedAt,
        endpointBreakdown: endpointBreakdown.map((e) => ({
          endpoint: e.endpoint,
          count: e._count.id,
        })),
        statusBreakdown: statusBreakdown.map((s) => ({
          statusCode: s.statusCode,
          count: s._count.id,
        })),
      },
      recentLogs: logs,
    },
  });
}
