import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/surveys
 * Returns all active (published) surveys for the mobile app.
 * Allowed roles: survey_agent, admin
 */
export async function GET(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'survey_agent', 'admin');
  if (roleError) return roleError;

  const surveys = await prisma.survey.findMany({
    where: { isActive: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      isActive: true,
      publishedAt: true,
      _count: { select: { questions: true, responses: true } },
    },
  });

  return NextResponse.json(surveys);
}
