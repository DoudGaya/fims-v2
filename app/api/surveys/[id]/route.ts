import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/surveys/[id] ────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  return NextResponse.json({ survey });
}

// ─── PATCH /api/surveys/[id] — update title / description ────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description } = body as { title?: string; description?: string };

  const survey = await prisma.survey.update({
    where: { id },
    data: {
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
    },
  });

  return NextResponse.json({ survey });
}

// ─── DELETE /api/surveys/[id] ─────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // SurveyAnswer.questionId FK has no ON DELETE CASCADE, so we must
  // remove answers referencing this survey's questions before deleting.
  await prisma.$transaction(async (tx) => {
    await tx.surveyAnswer.deleteMany({ where: { question: { surveyId: id } } });
    await tx.survey.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
