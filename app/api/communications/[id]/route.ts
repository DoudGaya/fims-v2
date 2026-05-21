import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissionConstants';
import prisma from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require read permission to delete logs (admin-level action)
    const canRead = await hasPermission(session.user.id, PERMISSIONS.COMMUNICATIONS_READ);
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const log = await prisma.communicationLog.findUnique({ where: { id } });
    if (!log) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    await prisma.communicationLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete communication log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
