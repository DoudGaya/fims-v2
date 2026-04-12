import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/surveys/farmers?search=xxx&limit=20
 * Search enrolled farmers for the survey farmer-selection step.
 * Allowed: survey_agent, admin
 */
export async function GET(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'survey_agent', 'admin');
  if (roleError) return roleError;

  const sp = req.nextUrl.searchParams;
  const search = sp.get('search')?.trim() ?? '';
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '20')));

  const farmers = await prisma.farmer.findMany({
    where: search
      ? {
          OR: [
            { firstName:  { contains: search, mode: 'insensitive' } },
            { lastName:   { contains: search, mode: 'insensitive' } },
            { middleName: { contains: search, mode: 'insensitive' } },
            { nin:        { contains: search, mode: 'insensitive' } },
            { phone:      { contains: search, mode: 'insensitive' } },
          ],
        }
      : {},
    take: limit,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true, nin: true,
      firstName: true, middleName: true, lastName: true,
      phone: true, state: true, lga: true,
    },
  });

  return NextResponse.json(farmers);
}
