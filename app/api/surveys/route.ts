import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// ─── GET /api/surveys — list all surveys (admin) ──────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const surveys = await prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true, responses: true } },
    },
  });

  return NextResponse.json({ surveys });
}

// ─── POST /api/surveys — create survey (admin) ────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description } = body as { title?: string; description?: string };

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const survey = await prisma.survey.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      createdByUserId: (session.user as any).id,
    },
    include: { _count: { select: { questions: true, responses: true } } },
  });

  return NextResponse.json({ survey }, { status: 201 });
}
