import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { generateApiToken } from '@/lib/api-key-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/api-keys/:id/rotate
 *
 * Generates a fresh token for an existing API key.
 * The old token is immediately invalidated.
 * The new full token is returned ONCE — it cannot be retrieved again.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const perms = (session.user as any).permissions as string[] | undefined;
  if (!perms?.includes(PERMISSIONS.SYSTEM_MANAGE_INTEGRATIONS)) {
    return NextResponse.json({ error: 'Forbidden: system.manage_integrations permission required.' }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.apiKey.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { token, keyPrefix, keyHash } = generateApiToken();

  const updated = await prisma.apiKey.update({
    where: { id },
    data: { keyPrefix, keyHash, isActive: true, requestCount: BigInt(0) },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
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
    /**
     * ⚠️  SECURITY NOTICE:
     * This is the ONLY time the new full API token is returned.
     * The old token is now permanently invalid.
     * Copy and store the new token securely — it cannot be retrieved again.
     */
    token,
    note: 'The previous token is now invalid. Update all integrations using this key.',
  });
}
