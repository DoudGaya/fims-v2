import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/mobile/surveys/[id]
 * Returns a single active survey with all questions and options.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'survey_agent', 'admin');
  if (roleError) return roleError;

  const survey = await prisma.survey.findFirst({
    where: { id, isActive: true },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      assignments: {
        select: { agentId: true, clusterId: true },
      },
    },
  });

  if (!survey) return NextResponse.json({ error: 'Survey not found or not active' }, { status: 404 });

  if (survey.assignments.length > 0 && user.role !== 'admin') {
    const isAssigned = survey.assignments.some((a) => a.agentId === user.id);
    if (!isAssigned) {
      return NextResponse.json({ error: 'Access denied: Survey is not assigned to you' }, { status: 403 });
    }
  }

  const { assignments: _a, ...result } = survey;
  return NextResponse.json(result);
}
