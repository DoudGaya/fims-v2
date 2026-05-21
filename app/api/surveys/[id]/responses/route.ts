import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/surveys/[id]/responses — admin response reporting ─────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const page  = Math.max(1, parseInt(sp.get('page')  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
  const skip  = (page - 1) * limit;

  const [responses, total] = await Promise.all([
    prisma.surveyResponse.findMany({
      where: { surveyId: id },
      skip,
      take: limit,
      orderBy: { completedAt: 'desc' },
      include: {
        farmer: {
          select: {
            id: true, firstName: true, middleName: true,
            lastName: true, nin: true, phone: true,
            state: true, lga: true,
            agent: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        answers: {
          include: {
            question: { select: { questionText: true, questionType: true } },
          },
        },
      },
    }),
    prisma.surveyResponse.count({ where: { surveyId: id } }),
  ]);

  return NextResponse.json({
    responses,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
