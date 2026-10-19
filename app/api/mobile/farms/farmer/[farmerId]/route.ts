import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

type RouteContext = { params: Promise<{ farmerId: string }> };

/**
 * GET /api/mobile/farms/farmer/[farmerId]
 * List all farms belonging to a farmer.
 * Allowed roles: agent, data_correction_agent, survey_agent, admin
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'survey_agent', 'admin');
  if (roleError) return roleError;

  const { farmerId } = await params;

  if (user.role === 'agent') {
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      select: { agentId: true },
    });
    if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    if (farmer.agentId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const farms = await prisma.farm.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ farms });
}
