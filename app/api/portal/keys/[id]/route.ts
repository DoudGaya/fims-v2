import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizationMemberships: true },
    });

    if (!user || user.organizationMemberships.length === 0) {
      return NextResponse.json({ error: 'No associated organization found' }, { status: 404 });
    }

    const orgId = user.organizationMemberships[0].organizationId;

    // Verify key belongs to this organization
    const key = await prisma.apiKey.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!key) {
      return NextResponse.json({ error: 'Key not found in your organization' }, { status: 404 });
    }

    // Mark inactive / revoked
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: `API Key (${key.keyPrefix}) has been revoked successfully.`,
    });
  } catch (err: any) {
    console.error('[Portal Keys DELETE] Error revoking key:', err);
    return NextResponse.json({ error: 'Failed to revoke key', details: err?.message }, { status: 500 });
  }
}
