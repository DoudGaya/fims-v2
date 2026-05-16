import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

/**
 * GET /api/mobile/correction/farmers/[id]/farms
 * Returns all farms for a given farmer.
 * Allowed roles: data_correction_agent, admin
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { id: farmerId } = await params;

  const farmer = await prisma.farmer.findUnique({
    where: { id: farmerId },
    select: { id: true },
  });
  if (!farmer) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  const farms = await prisma.farm.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(farms);
}
