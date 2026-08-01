import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissionConstants';
import prisma from '@/lib/prisma';
import { sendCustomEmail } from '@/lib/emailService';
import TermiiService from '@/lib/termiiService';

const termii = new TermiiService();

// Maximum recipients per bulk send
const BULK_LIMIT = 500;

interface BulkFilters {
  state?: string;
  lga?: string;
  clusterId?: string;
  status?: string;
  agentId?: string;
}

interface SendBody {
  channel: 'email' | 'sms' | 'both';
  subject?: string;
  body: string;
  recipients: {
    mode: 'individual' | 'bulk';
    recipientType: 'farmer' | 'agent';
    id?: string;
    filters?: BulkFilters;
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canSend = await hasPermission(session.user.id, PERMISSIONS.COMMUNICATIONS_SEND);
    if (!canSend) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: SendBody = await req.json();
    const { channel, subject, body, recipients } = data;

    // Basic validation
    if (!body?.trim()) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
    }
    if ((channel === 'email' || channel === 'both') && !subject?.trim()) {
      return NextResponse.json({ error: 'Subject is required for email messages' }, { status: 400 });
    }
    if (!['email', 'sms', 'both'].includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }
    if (!['individual', 'bulk'].includes(recipients.mode)) {
      return NextResponse.json({ error: 'Invalid recipient mode' }, { status: 400 });
    }

    // ── Resolve recipients ───────────────────────────────────────────────────
    type Recipient = { id: string; name: string; email?: string | null; phone?: string | null };
    let recipientList: Recipient[] = [];

    if (recipients.mode === 'individual') {
      if (!recipients.id) {
        return NextResponse.json({ error: 'Recipient id is required for individual mode' }, { status: 400 });
      }

      if (recipients.recipientType === 'farmer') {
        const farmer = await prisma.farmer.findUnique({
          where: { id: recipients.id },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        });
        if (!farmer) return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
        recipientList = [{ id: farmer.id, name: `${farmer.firstName} ${farmer.lastName}`, email: farmer.email, phone: farmer.phone }];
      } else {
        // agent — look up through User + Agent join
        const user = await prisma.user.findUnique({
          where: { id: recipients.id },
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, agent: { select: { phone: true } } },
        });
        if (!user) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        recipientList = [{
          id: user.id,
          name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
          email: user.email,
          phone: user.agent?.phone || user.phoneNumber,
        }];
      }
    } else {
      // Bulk mode
      const filters = recipients.filters ?? {};

      if (recipients.recipientType === 'farmer') {
        const where: Record<string, any> = {};
        if (filters.state) where.state = filters.state;
        if (filters.lga) where.lga = filters.lga;
        if (filters.clusterId) where.clusterId = filters.clusterId;
        if (filters.status) where.status = filters.status;
        if (filters.agentId) where.agentId = filters.agentId;

        const farmers = await prisma.farmer.findMany({
          where,
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          take: BULK_LIMIT,
        });
        recipientList = farmers.map(f => ({ id: f.id, name: `${f.firstName} ${f.lastName}`, email: f.email, phone: f.phone }));
      } else {
        const where: Record<string, any> = { role: { in: ['agent', 'data_correction_agent', 'survey_agent'] } };
        if (filters.state) where.agent = { ...(where.agent || {}), state: filters.state };
        if (filters.agentId) where.id = filters.agentId;

        const users = await prisma.user.findMany({
          where,
          select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, agent: { select: { phone: true } } },
          take: BULK_LIMIT,
        });
        recipientList = users.map(u => ({
          id: u.id,
          name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
          email: u.email,
          phone: u.agent?.phone || u.phoneNumber,
        }));
      }

      if (recipientList.length === 0) {
        return NextResponse.json({ error: 'No recipients matched the selected filters' }, { status: 400 });
      }
    }

    // ── Send messages ────────────────────────────────────────────────────────
    let sentCount = 0;
    let failedCount = 0;
    const failureDetails: { id: string; name: string; error: string }[] = [];

    for (const recipient of recipientList) {
      const errors: string[] = [];

      // Parse first and last names for personalization
      const nameParts = recipient.name.split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const replacePlaceholders = (text: string) => {
        return text
          .replace(/{name}/g, recipient.name)
          .replace(/{recipientName}/g, recipient.name)
          .replace(/{firstName}/g, firstName)
          .replace(/{lastName}/g, lastName)
          .replace(/{email}/g, recipient.email ?? '')
          .replace(/{phone}/g, recipient.phone ?? '')
          .replace(/{senderName}/g, session.user.name ?? 'CCSA Admin');
      };

      const customizedBody = replacePlaceholders(body);
      const customizedSubject = subject ? replacePlaceholders(subject) : undefined;

      if (channel === 'email' || channel === 'both') {
        if (recipient.email) {
          const result = await sendCustomEmail(recipient.email, recipient.name, customizedSubject!, customizedBody);
          if (!result.success) errors.push(`Email: ${result.error}`);
        } else {
          errors.push('Email: no email address on file');
        }
      }

      if (channel === 'sms' || channel === 'both') {
        if (recipient.phone) {
          const result = await termii.sendMessage(recipient.phone, customizedBody);
          if (!result.success) errors.push(`SMS: ${result.error}`);
        } else {
          errors.push('SMS: no phone number on file');
        }
      }

      if (errors.length === 0) {
        sentCount++;
      } else {
        failedCount++;
        failureDetails.push({ id: recipient.id, name: recipient.name, error: errors.join('; ') });
      }
    }

    // ── Log the communication ────────────────────────────────────────────────
    const isIndividual = recipients.mode === 'individual';
    const firstRecipient = isIndividual ? recipientList[0] : null;
    const overallStatus = failedCount === 0 ? 'sent' : sentCount === 0 ? 'failed' : 'partial';

    const log = await prisma.communicationLog.create({
      data: {
        subject: subject ?? null,
        body,
        channel,
        recipientType: isIndividual ? recipients.recipientType : `bulk_${recipients.recipientType}`,
        recipientId: firstRecipient?.id ?? null,
        recipientName: firstRecipient?.name ?? null,
        recipientContact: firstRecipient
          ? (channel !== 'sms' ? firstRecipient.email : firstRecipient.phone) ?? null
          : null,
        recipientCount: recipientList.length,
        status: overallStatus,
        failureDetails: failureDetails.length > 0 ? failureDetails : undefined,
        filters: !isIndividual ? (recipients.filters ? JSON.parse(JSON.stringify(recipients.filters)) : {}) : undefined,
        sentById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      total: recipientList.length,
      status: overallStatus,
      logId: log.id,
    });
  } catch (error: any) {
    console.error('Communications send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
