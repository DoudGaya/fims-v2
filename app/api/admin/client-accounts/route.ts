import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PERMISSIONS } from '@/lib/permissions';
import { generateApiToken } from '@/lib/api-key-auth';
import { sendApiPortalCredentialsEmail } from '@/lib/emailService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) return null;
  return session;
}

const createAccountSchema = z.object({
  organizationName: z.string().min(2, 'Organisation name is required').max(200),
  rcNumber: z.string().max(50).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  contactName: z.string().min(2, 'Contact name is required').max(200),
  email: z.string().email('Valid corporate email is required'),
  phone: z.string().max(30).optional().nullable(),
  scopes: z.array(z.string()).min(1, 'Select at least one scope'),
  rateLimit: z.number().int().min(1).max(5000).default(120),
  monthlyQuota: z.number().int().min(100).max(10000000).default(50000),
  allowSensitiveFields: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
  customPassword: z.string().min(6).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await authorize(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed.', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  // 1. Password generation
  let tempPassword = data.customPassword;
  if (!tempPassword) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    tempPassword = 'Fims-';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    tempPassword += '!9';
  }
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // 2. User upsert
  const clientUser = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      displayName: data.contactName,
      phoneNumber: data.phone ?? undefined,
      isActive: true,
      role: 'client',
    },
    create: {
      email,
      displayName: data.contactName,
      password: hashedPassword,
      phoneNumber: data.phone ?? null,
      isActive: true,
      isVerified: true,
      role: 'client',
    },
  });

  // 3. Organization upsert
  let org = await prisma.organization.findFirst({
    where: {
      OR: [{ contactEmail: email }, { name: data.organizationName }],
    },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: data.organizationName,
        rcNumber: data.rcNumber ?? null,
        taxId: data.taxId ?? null,
        contactEmail: email,
        contactPhone: data.phone ?? 'N/A',
        tier: 'ENTERPRISE_KYC',
        status: 'ACTIVE',
        monthlyQuota: data.monthlyQuota,
        currentUsage: 0,
        billingCurrency: 'NGN',
      },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        status: 'ACTIVE',
        monthlyQuota: data.monthlyQuota,
        rcNumber: data.rcNumber ?? org.rcNumber,
        taxId: data.taxId ?? org.taxId,
      },
    });
  }

  // 4. Link User to Organization
  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: clientUser.id,
      },
    },
    update: { role: 'OWNER' },
    create: {
      organizationId: org.id,
      userId: clientUser.id,
      role: 'OWNER',
    },
  });

  // 5. Generate API token and create live ApiKey
  const { token, keyPrefix, keyHash } = generateApiToken();
  const apiKey = await prisma.apiKey.create({
    data: {
      keyPrefix,
      keyHash,
      name: `${data.organizationName} Live Key`,
      description: `Created directly by admin (${session.user?.email || 'admin'})`,
      scopes: data.scopes,
      allowSensitiveFields: data.allowSensitiveFields,
      rateLimit: data.rateLimit,
      isActive: true,
      createdByUserId: (session.user as any).id || clientUser.id,
      organizationId: org.id,
    },
  });

  // 6. Send credentials email if enabled
  const loginUrl = `${process.env.NEXTAUTH_URL || 'https://fims.cosmopolitan.edu.ng'}/portal/login`;
  if (data.sendEmail) {
    sendApiPortalCredentialsEmail({
      recipientEmail: email,
      recipientName: data.contactName,
      organizationName: data.organizationName,
      temporaryPassword: tempPassword,
      loginUrl,
      apiKeyToken: token,
      apiKeyPrefix: keyPrefix,
      approvedScopes: data.scopes,
      rateLimit: data.rateLimit,
    }).catch((err) => console.error('Failed to send client credentials email:', err));
  }

  return NextResponse.json(
    {
      success: true,
      message: 'Client access account and API key created successfully.',
      account: {
        userId: clientUser.id,
        email: clientUser.email,
        displayName: clientUser.displayName,
        organizationId: org.id,
        organizationName: org.name,
        temporaryPassword: tempPassword,
        apiKey: {
          id: apiKey.id,
          token,
          keyPrefix,
          scopes: data.scopes,
          rateLimit: data.rateLimit,
        },
      },
    },
    { status: 201 }
  );
}
