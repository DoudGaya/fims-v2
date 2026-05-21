import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissionConstants';
import prisma from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRead = await hasPermission(session.user.id, PERMISSIONS.COMMUNICATIONS_READ);
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [total, sent, failed, partial, email, sms, both, recipientSum] = await Promise.all([
      prisma.communicationLog.count(),
      prisma.communicationLog.count({ where: { status: 'sent' } }),
      prisma.communicationLog.count({ where: { status: 'failed' } }),
      prisma.communicationLog.count({ where: { status: 'partial' } }),
      prisma.communicationLog.count({ where: { channel: 'email' } }),
      prisma.communicationLog.count({ where: { channel: 'sms' } }),
      prisma.communicationLog.count({ where: { channel: 'both' } }),
      prisma.communicationLog.aggregate({ _sum: { recipientCount: true } }),
    ]);

    return NextResponse.json({
      total,
      sent,
      failed,
      partial,
      channels: { email, sms, both },
      totalRecipients: recipientSum._sum.recipientCount ?? 0,
    });
  } catch (error) {
    console.error('Communications stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
