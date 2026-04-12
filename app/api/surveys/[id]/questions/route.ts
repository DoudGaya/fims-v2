import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

const VALID_TYPES = ['TEXT', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'NUMBER', 'YES_NO', 'DATE'];

// ─── GET /api/surveys/[id]/questions ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const questions = await prisma.surveyQuestion.findMany({
    where: { surveyId: id },
    orderBy: { order: 'asc' },
    include: { options: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ questions });
}

// ─── POST /api/surveys/[id]/questions — add a question ───────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    questionText?: string;
    questionType?: string;
    isRequired?: boolean;
    options?: { optionText: string }[];
  };

  if (!body.questionText?.trim()) {
    return NextResponse.json({ error: 'questionText is required' }, { status: 400 });
  }

  if (!body.questionType || !VALID_TYPES.includes(body.questionType)) {
    return NextResponse.json(
      { error: `questionType must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  // Determine next order value
  const lastQ = await prisma.surveyQuestion.findFirst({
    where: { surveyId: id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const nextOrder = (lastQ?.order ?? 0) + 1;

  const question = await prisma.surveyQuestion.create({
    data: {
      surveyId: id,
      questionText: body.questionText.trim(),
      questionType: body.questionType,
      isRequired: body.isRequired ?? true,
      order: nextOrder,
      options: {
        create: (body.options ?? []).map((o, idx) => ({
          optionText: o.optionText,
          order: idx + 1,
        })),
      },
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ question }, { status: 201 });
}
