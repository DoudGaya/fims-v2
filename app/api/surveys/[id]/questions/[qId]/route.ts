import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string; qId: string }> };

// ─── PATCH /api/surveys/[id]/questions/[qId] — edit question ─────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { qId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const VALID_TYPES = ['TEXT', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'NUMBER', 'YES_NO', 'DATE'];

  const body = await req.json() as {
    questionText?: string;
    questionType?: string;
    isRequired?: boolean;
    order?: number;
    options?: { optionText: string }[];
  };

  if (body.questionType && !VALID_TYPES.includes(body.questionType)) {
    return NextResponse.json(
      { error: `questionType must be one of: ${VALID_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  const question = await prisma.surveyQuestion.update({
    where: { id: qId },
    data: {
      ...(body.questionText?.trim() ? { questionText: body.questionText.trim() } : {}),
      ...(body.questionType ? { questionType: body.questionType } : {}),
      ...(body.isRequired !== undefined ? { isRequired: body.isRequired } : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
      // Replace options if provided
      ...(body.options !== undefined
        ? {
            options: {
              deleteMany: {},
              create: body.options.map((o, idx) => ({
                optionText: o.optionText,
                order: idx + 1,
              })),
            },
          }
        : {}),
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ question });
}

// ─── DELETE /api/surveys/[id]/questions/[qId] ─────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { qId } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.surveyQuestion.delete({ where: { id: qId } });

  return NextResponse.json({ success: true });
}
