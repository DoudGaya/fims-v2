import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read', 'nin:verify'] as const;

const updateKeySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  scopes: z.array(z.enum(VALID_SCOPES)).min(1).optional(),
  /**
   * ⚠️  allowSensitiveFields: Exposes NIN, BVN, bank details, and contact fields.
   * Only enable for internal CCSA products — NEVER for third-party integrations.
   */
  allowSensitiveFields: z.boolean().optional(),
  rateLimit: z.number().int().min(1).max(5000).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

// ── Auth helper ────────────────────────────────────────────────────────────────

async function authorize(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) return null;
  return session;
}

// ── GET /api/admin/api-keys/:id ────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      description: true,
      scopes: true,
      allowSensitiveFields: true,
      rateLimit: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      requestCount: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...apiKey,
      requestCount: Number(apiKey.requestCount),
    },
  });
}

// ── PATCH /api/admin/api-keys/:id ─────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = updateKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { expiresAt, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (expiresAt !== undefined) {
    updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      description: true,
      scopes: true,
      allowSensitiveFields: true,
      rateLimit: true,
      isActive: true,
      expiresAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    data: updated,
    warning:
      updated.allowSensitiveFields && !existing.allowSensitiveFields
        ? '⚠️  allowSensitiveFields was just enabled for this token. It will now expose NIN, BVN, bank details and contact fields. Only share with internal CCSA products.'
        : undefined,
  });
}

// ── DELETE /api/admin/api-keys/:id ─────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized or insufficient permissions.' }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const isPermanent =
    url.searchParams.get('permanent') === 'true' ||
    url.searchParams.get('hard') === 'true';

  const existing = await prisma.apiKey.findUnique({
    where: { id },
    include: {
      organization: {
        include: {
          apiKeys: true,
          users: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  if (isPermanent) {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all usage logs for this API key
      await tx.apiKeyUsageLog.deleteMany({ where: { apiKeyId: id } });

      // 2. Delete the API key
      await tx.apiKey.delete({ where: { id } });

      // 3. If organization was created for this key and has no other keys, clean up org data
      if (existing.organizationId && existing.organization) {
        const remainingKeys = existing.organization.apiKeys.filter((k) => k.id !== id);
        if (remainingKeys.length === 0) {
          await tx.invoice.deleteMany({ where: { organizationId: existing.organizationId } });
          await tx.subscription.deleteMany({ where: { organizationId: existing.organizationId } });
          const userIds = existing.organization.users.map((u) => u.userId);
          await tx.organizationUser.deleteMany({ where: { organizationId: existing.organizationId } });
          await tx.organization.delete({ where: { id: existing.organizationId } });

          // If client users have no other org memberships, delete them as well
          for (const uid of userIds) {
            const user = await tx.user.findUnique({
              where: { id: uid },
              include: { organizationMemberships: true },
            });
            if (user && user.role === 'client' && user.organizationMemberships.length === 0) {
              await tx.user.delete({ where: { id: uid } });
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'API key access and associated demo data permanently deleted.',
    });
  }

  // Soft-revoke: mark inactive, preserve usage logs
  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({
    success: true,
    message: 'API key revoked. Usage logs are preserved.',
  });
}
