import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissionConstants';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRead = await hasPermission(session.user.id, PERMISSIONS.COMMUNICATIONS_READ);
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const channel = searchParams.get('channel') ?? undefined;
    const recipientType = searchParams.get('recipientType') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;

    const where: Record<string, any> = {};
    if (channel) where.channel = channel;
    if (recipientType) where.recipientType = { contains: recipientType };
    if (from || to) {
      where.sentAt = {};
      if (from) where.sentAt.gte = new Date(from);
      if (to) where.sentAt.lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      prisma.communicationLog.count({ where }),
      prisma.communicationLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sentBy: {
            select: { id: true, displayName: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Communications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
