import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissionConstants';
import prisma from '@/lib/prisma';
import { sendCustomEmail } from '@/lib/emailService';
import TermiiService from '@/lib/termiiService';

const termii = new TermiiService();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canSend = await hasPermission(session.user.id, PERMISSIONS.COMMUNICATIONS_SEND);
    if (!canSend) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const log = await prisma.communicationLog.findUnique({ where: { id } });
    if (!log) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    // Bulk sends cannot be retried — no stored per-recipient list
    if (log.recipientType.startsWith('bulk_') || !log.recipientId) {
      return NextResponse.json(
        { error: 'Bulk sends cannot be retried. Please compose a new message.' },
        { status: 400 },
      );
    }

    // Re-fetch recipient contact info
    let recipientEmail: string | null = null;
    let recipientPhone: string | null = null;
    let recipientName = log.recipientName ?? '';

    if (log.recipientType === 'farmer') {
      const farmer = await prisma.farmer.findUnique({
        where: { id: log.recipientId },
        select: { firstName: true, lastName: true, email: true, phone: true },
      });
      if (!farmer) {
        return NextResponse.json({ error: 'Recipient no longer exists' }, { status: 404 });
      }
      recipientEmail = farmer.email;
      recipientPhone = farmer.phone;
      recipientName = `${farmer.firstName} ${farmer.lastName}`;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: log.recipientId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          agent: { select: { phone: true } },
        },
      });
      if (!user) {
        return NextResponse.json({ error: 'Recipient no longer exists' }, { status: 404 });
      }
      recipientEmail = user.email;
      recipientPhone = user.agent?.phone || user.phoneNumber;
      recipientName =
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
    }

    // Re-send
    const errors: string[] = [];

    if (log.channel === 'email' || log.channel === 'both') {
      if (recipientEmail) {
        const result = await sendCustomEmail(
          recipientEmail,
          recipientName,
          log.subject ?? '',
          log.body,
        );
        if (!result.success) errors.push(`Email: ${result.error}`);
      } else {
        errors.push('Email: no email address on file');
      }
    }

    if (log.channel === 'sms' || log.channel === 'both') {
      if (recipientPhone) {
        const result = await termii.sendMessage(recipientPhone, log.body);
        if (!result.success) errors.push(`SMS: ${result.error}`);
      } else {
        errors.push('SMS: no phone number on file');
      }
    }

    const sentCount = errors.length === 0 ? 1 : 0;
    const failedCount = errors.length > 0 ? 1 : 0;
    const overallStatus = errors.length === 0 ? 'sent' : 'failed';

    // Create a new log entry for this retry attempt
    const newLog = await prisma.communicationLog.create({
      data: {
        subject: log.subject,
        body: log.body,
        channel: log.channel,
        recipientType: log.recipientType,
        recipientId: log.recipientId,
        recipientName,
        recipientContact:
          log.channel !== 'sms' ? recipientEmail : recipientPhone,
        recipientCount: 1,
        status: overallStatus,
        failureDetails:
          errors.length > 0
            ? [{ id: log.recipientId, name: recipientName, error: errors.join('; ') }]
            : undefined,
        sentById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      status: overallStatus,
      logId: newLog.id,
      sentCount,
      failedCount,
    });
  } catch (error) {
    console.error('Retry communication error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
