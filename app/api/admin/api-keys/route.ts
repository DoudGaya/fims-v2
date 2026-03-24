import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { generateApiToken } from '@/lib/api-key-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read'] as const;

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

  return NextResponse.json({
    data: keys,
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
