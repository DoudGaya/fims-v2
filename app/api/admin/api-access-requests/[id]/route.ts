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

const patchSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  adminNotes: z.string().max(2000).optional().nullable(),
  approvedScopes: z.array(z.string()).optional(),
  rateLimit: z.number().int().min(1).max(5000).optional(),
  monthlyQuota: z.number().int().min(100).max(10000000).optional(),
  allowSensitiveFields: z.boolean().optional(),
});

// ── GET /api/admin/api-access-requests/:id ───────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;
  const record = await prisma.apiAccessRequest.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  return NextResponse.json(record);
}

// ── PATCH /api/admin/api-access-requests/:id ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authorize(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed.', details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.apiAccessRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { status, adminNotes, approvedScopes, rateLimit, monthlyQuota, allowSensitiveFields } = parsed.data;

  // If status is REJECTED or PENDING, perform simple update
  if (status !== 'APPROVED') {
    const updated = await prisma.apiAccessRequest.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes ?? null,
        reviewedByUserId: (session.user as any).id || null,
        reviewedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, request: updated });
  }

  // ── Approval & Automated Provisioning ──────────────────────────────────────
  const finalScopes = approvedScopes && approvedScopes.length > 0 ? approvedScopes : existing.requestedScopes;
  const finalRateLimit = rateLimit ?? 120;
  const finalQuota = monthlyQuota ?? 50000;
  const finalSensitive = allowSensitiveFields ?? false;

  // 1. Generate strong temporary password for the client
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let tempPassword = 'Fims-';
  for (let i = 0; i < 8; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  tempPassword += '!9';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // 2. Provision or update User account
  const clientUser = await prisma.user.upsert({
    where: { email: existing.email.toLowerCase().trim() },
    update: {
      password: hashedPassword,
      displayName: existing.contactName,
      phoneNumber: existing.phone ?? undefined,
      isActive: true,
      role: 'client',
    },
    create: {
      email: existing.email.toLowerCase().trim(),
      displayName: existing.contactName,
      password: hashedPassword,
      phoneNumber: existing.phone ?? null,
      isActive: true,
      isVerified: true,
      role: 'client',
    },
  });

  // 3. Provision or locate Organization
  let org = await prisma.organization.findFirst({
    where: {
      OR: [
        { contactEmail: existing.email.toLowerCase().trim() },
        { name: existing.organizationName },
      ],
    },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: existing.organizationName,
        rcNumber: existing.rcNumber ?? null,
        taxId: existing.taxId ?? null,
        contactEmail: existing.email.toLowerCase().trim(),
        contactPhone: existing.phone ?? 'N/A',
        tier: 'ENTERPRISE_KYC',
        status: 'ACTIVE',
        monthlyQuota: finalQuota,
        currentUsage: 0,
        billingCurrency: 'NGN',
      },
    });
  } else {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: {
        status: 'ACTIVE',
        monthlyQuota: finalQuota,
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

  // 5. Generate and store live API key
  const { token, keyPrefix, keyHash } = generateApiToken();
  const apiKey = await prisma.apiKey.create({
    data: {
      keyPrefix,
      keyHash,
      name: `${existing.organizationName} Live Key`,
      description: `Provisioned on request approval (${id})`,
      scopes: finalScopes,
      allowSensitiveFields: finalSensitive,
      rateLimit: finalRateLimit,
      isActive: true,
      createdByUserId: (session.user as any).id || clientUser.id,
      organizationId: org.id,
    },
  });

  // 6. Update the ApiAccessRequest record
  const updatedRequest = await prisma.apiAccessRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      adminNotes: adminNotes ?? existing.adminNotes,
      reviewedByUserId: (session.user as any).id || null,
      reviewedAt: new Date(),
      credentialsSentAt: new Date(),
    },
  });

  // 7. Dispatch credentials email
  const loginUrl = `${process.env.NEXTAUTH_URL || 'https://fims.cosmopolitan.edu.ng'}/portal/login`;
  sendApiPortalCredentialsEmail({
    recipientEmail: existing.email,
    recipientName: existing.contactName,
    organizationName: existing.organizationName,
    temporaryPassword: tempPassword,
    loginUrl,
    apiKeyToken: token,
    apiKeyPrefix: keyPrefix,
    approvedScopes: finalScopes,
    rateLimit: finalRateLimit,
  }).catch((err) => console.error('Failed to dispatch API portal credentials email:', err));

  return NextResponse.json({
    success: true,
    message: 'Access request approved. Client account and live API key provisioned, and credentials sent via email.',
    request: updatedRequest,
    credentials: {
      email: existing.email,
      temporaryPassword: tempPassword,
      loginUrl,
      apiKey: {
        id: apiKey.id,
        token,
        keyPrefix,
        scopes: finalScopes,
        rateLimit: finalRateLimit,
      },
      organization: {
        id: org.id,
        name: org.name,
      },
    },
  });
}
