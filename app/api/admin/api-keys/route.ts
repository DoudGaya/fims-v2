import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { generateApiToken } from '@/lib/api-key-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read', 'nin:verify'] as const;

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(500).optional(),
  scopes: z
    .array(z.enum(VALID_SCOPES))
    .min(1, 'At least one scope is required'),
  /**
   * ⚠️  allowSensitiveFields: Only enable for internal CCSA products.
   * Exposes NIN, BVN, bank details, and contact fields.
   * NEVER enable for third-party integrations.
   */
  allowSensitiveFields: z.boolean().default(false),
  /** Requests per minute. Recommended: 100 (standard) | 500 (high-volume partner) */
  rateLimit: z.number().int().min(1).max(5000).default(100),
  expiresAt: z.string().datetime().optional().nullable(),
});

// ── GET /api/admin/api-keys — list all keys ───────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) {
    return NextResponse.json({ error: 'Forbidden: system.manage_integrations permission required.' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')));
  const skip = (page - 1) * limit;

  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    }),
    prisma.apiKey.count(),
  ]);

  const serializedKeys = keys.map((key) => ({
    ...key,
    requestCount: Number(key.requestCount),
  }));

  return NextResponse.json({
    data: serializedKeys,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    rateLimitRecommendations: {
      standard: 100,
      highVolume: 500,
      note: 'Custom limits can be set per key. Increase only for verified partners.',
    },
  });
}

// ── POST /api/admin/api-keys — create a new key ───────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) {
    return NextResponse.json({ error: 'Forbidden: system.manage_integrations permission required.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, description, scopes, allowSensitiveFields, rateLimit, expiresAt } = parsed.data;

  const { token, keyPrefix, keyHash } = generateApiToken();

  const apiKey = await prisma.apiKey.create({
    data: {
      keyPrefix,
      keyHash,
      name,
      description,
      scopes,
      allowSensitiveFields,
      rateLimit,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdByUserId: (session.user as any).id,
    },
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
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      data: apiKey,
      /**
       * ⚠️  SECURITY NOTICE:
       * This is the ONLY time the full API token is returned.
       * It is NOT stored server-side (only a hash is kept).
       * Copy and store it securely now. It cannot be retrieved again.
       */
      token,
      warning: allowSensitiveFields
        ? '⚠️  This token has allowSensitiveFields=true. It will expose NIN, BVN, bank details and contact fields. Only share with internal CCSA products.'
        : undefined,
      instructions:
        'Pass this token as: Authorization: Bearer <token>  OR  X-API-Key: <token>',
      docs: 'https://fims.cosmopolitan.edu.ng/docs',
    },
    { status: 201 }
  );
}

// ── DELETE /api/admin/api-keys — Purge demo data or delete keys ──────────────

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) {
    return NextResponse.json(
      { error: 'Forbidden: system.manage_integrations permission required.' },
      { status: 403 }
    );
  }

  let body: { keyIds?: string[]; purgeDemoData?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // allow query param fallback
  }

  const url = new URL(req.url);
  const purgeDemo =
    body.purgeDemoData === true ||
    url.searchParams.get('demo') === 'true' ||
    url.searchParams.get('purgeDemo') === 'true';

  if (purgeDemo) {
    // Identify all demo/test keys and test organizations created during testing
    const demoKeys = await prisma.apiKey.findMany({
      where: {
        OR: [
          { name: { contains: 'Nillar', mode: 'insensitive' } },
          { name: { contains: 'Shopagric', mode: 'insensitive' } },
          { name: { contains: 'AgroFin', mode: 'insensitive' } },
          { name: { contains: 'REFAN', mode: 'insensitive' } },
          { name: { equals: 'api-keys' } },
          { description: { contains: 'testing', mode: 'insensitive' } },
          { description: { contains: 'B2B onboarding', mode: 'insensitive' } },
        ],
      },
      include: {
        organization: {
          include: {
            users: true,
          },
        },
      },
    });

    const keyIds = demoKeys.map((k) => k.id);
    const orgIds = demoKeys
      .map((k) => k.organizationId)
      .filter(Boolean) as string[];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete usage logs for demo keys
      if (keyIds.length > 0) {
        await tx.apiKeyUsageLog.deleteMany({
          where: { apiKeyId: { in: keyIds } },
        });

        // 2. Delete demo API keys
        await tx.apiKey.deleteMany({
          where: { id: { in: keyIds } },
        });
      }

      // 3. Clean up demo organizations and mock invoices
      let deletedOrgsCount = 0;
      if (orgIds.length > 0) {
        await tx.invoice.deleteMany({
          where: { organizationId: { in: orgIds } },
        });

        await tx.subscription.deleteMany({
          where: { organizationId: { in: orgIds } },
        });

        const orgUsers = await tx.organizationUser.findMany({
          where: { organizationId: { in: orgIds } },
        });
        const userIds = orgUsers.map((u) => u.userId);

        await tx.organizationUser.deleteMany({
          where: { organizationId: { in: orgIds } },
        });

        const deletedOrgs = await tx.organization.deleteMany({
          where: { id: { in: orgIds } },
        });
        deletedOrgsCount = deletedOrgs.count;

        // Clean up client users associated solely with these demo orgs
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

      return { deletedKeysCount: keyIds.length, deletedOrgsCount };
    });

    return NextResponse.json({
      success: true,
      message: `Demo data purged successfully. Removed ${result.deletedKeysCount} demo API key(s) and ${result.deletedOrgsCount} test organization(s).`,
      deletedKeysCount: result.deletedKeysCount,
      deletedOrgsCount: result.deletedOrgsCount,
    });
  }

  if (body.keyIds && body.keyIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.apiKeyUsageLog.deleteMany({
        where: { apiKeyId: { in: body.keyIds } },
      });
      await tx.apiKey.deleteMany({
        where: { id: { in: body.keyIds } },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${body.keyIds.length} API key(s).`,
    });
  }

  return NextResponse.json(
    { error: 'Specify keyIds or purgeDemoData=true to delete API keys.' },
    { status: 400 }
  );
}
