import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/surveys
 * Returns active (published) surveys for the mobile app.
 * If a survey has assignments, only assigned agents (or agents in assigned clusters) can see it.
 * If a survey has NO assignments, it is visible to all agents.
 * Allowed roles: survey_agent, admin
 */
export async function GET(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'survey_agent', 'admin');
  if (roleError) return roleError;

  // Fetch surveys with their assignments for visibility filtering.
  const allActiveSurveys = await prisma.survey.findMany({
    where: { isActive: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      isActive: true,
      publishedAt: true,
      _count: { select: { questions: true, responses: true } },
      assignments: {
        select: { agentId: true, clusterId: true },
      },
    },
  });

  // Filter: no assignments → visible to all; has assignments → only assigned agent (or admin)
  const visible = allActiveSurveys.filter((survey) => {
    if (survey.assignments.length === 0) return true;
    if (user.role === 'admin') return true;
    return survey.assignments.some((a) => a.agentId === user.id);
  });

  // Strip assignments from the response payload
  const result = visible.map(({ assignments: _a, ...rest }) => rest);

  return NextResponse.json(result);
}
