import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/mobile/surveys/[id]/completion?farmerId=xxx
 * Check whether a farmer has already completed this survey.
 *
 * POST /api/mobile/surveys/[id]/responses
 * Submit a completed survey response for a farmer.
 */

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'survey_agent', 'admin');
  if (roleError) return roleError;

  const farmerId = req.nextUrl.searchParams.get('farmerId');
  if (!farmerId) {
    return NextResponse.json({ error: 'farmerId query param is required' }, { status: 400 });
  }

  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_farmerId: { surveyId: id, farmerId } },
    select: { id: true },
  });

  return NextResponse.json({
    completed: !!existing,
    responseId: existing?.id ?? null,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'survey_agent', 'admin');
  if (roleError) return roleError;

  const body = await req.json() as {
    farmerId?: string;
    answers?: { questionId: string; answerText?: string | null; selectedOptionIds?: string[] }[];
  };

  if (!body.farmerId) {
    return NextResponse.json({ error: 'farmerId is required' }, { status: 400 });
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'answers array is required' }, { status: 400 });
  }

  // Verify survey exists and is active
  const survey = await prisma.survey.findFirst({
    where: { id, isActive: true },
    include: {
      questions: { select: { id: true, isRequired: true, questionType: true } },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: 'Survey not found or not active' }, { status: 404 });
  }

  // Validate required questions are answered
  for (const q of survey.questions) {
    if (!q.isRequired) continue;
    const draft = body.answers.find((a) => a.questionId === q.id);
    const hasText = draft?.answerText?.trim();
    const hasOptions = (draft?.selectedOptionIds?.length ?? 0) > 0;
    if (!hasText && !hasOptions) {
      return NextResponse.json(
        { error: `Question ${q.id} is required but has no answer` },
        { status: 422 },
      );
    }
  }

  // Prevent duplicate submission
  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_farmerId: { surveyId: id, farmerId: body.farmerId } },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'This farmer has already completed this survey' },
      { status: 409 },
    );
  }

  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: id,
      farmerId: body.farmerId,
      submittedByUserId: user.id,
      answers: {
        create: body.answers.map((a) => ({
          questionId: a.questionId,
          answerText: a.answerText ?? null,
          selectedOptionIds: a.selectedOptionIds ?? [],
        })),
      },
    },
    select: { id: true, surveyId: true, farmerId: true, completedAt: true },
  });

  return NextResponse.json(response, { status: 201 });
}
