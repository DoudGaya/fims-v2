import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// ─── POST /api/surveys/[id]/publish — toggle published state ─────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await hasPermission(session.user.id, PERMISSIONS.SURVEYS_WRITE);
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { publish: boolean };
  const publish = Boolean(body.publish);

  const survey = await prisma.survey.update({
    where: { id },
    data: {
      isActive: publish,
      publishedAt: publish ? new Date() : null,
    },
  });

  return NextResponse.json({ survey });
}
