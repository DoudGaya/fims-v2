import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import prisma from '@/lib/prisma';

/**
 * GET  /api/surveys/[id]/assignments  — List assignments for a survey
 * POST /api/surveys/[id]/assignments  — Add an agent or cluster assignment
 * DELETE /api/surveys/[id]/assignments — Remove an assignment (body: { assignmentId })
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: surveyId } = await params;

  const assignments = await prisma.surveyAssignment.findMany({
    where: { surveyId },
    include: {
      agent:   { select: { id: true, firstName: true, lastName: true, email: true } },
      cluster: { select: { id: true, title: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await hasPermission(session.user.id, PERMISSIONS.SURVEYS_WRITE);
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: surveyId } = await params;

  const survey = await prisma.survey.findUnique({ where: { id: surveyId }, select: { id: true } });
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

  let body: { agentId?: string; clusterId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.agentId && !body.clusterId) {
    return NextResponse.json({ error: 'agentId or clusterId is required' }, { status: 400 });
  }

  const assignment = await prisma.surveyAssignment.create({
    data: {
      surveyId,
      agentId:   body.agentId  ?? null,
      clusterId: body.clusterId ?? null,
    },
    include: {
      agent:   { select: { id: true, firstName: true, lastName: true, email: true } },
      cluster: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await hasPermission(session.user.id, PERMISSIONS.SURVEYS_WRITE);
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await params; // consume

  let body: { assignmentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.assignmentId) {
    return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
  }

  try {
    await prisma.surveyAssignment.delete({ where: { id: body.assignmentId } });
  } catch {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
