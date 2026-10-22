import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { ROLE_PERMISSIONS } from '@/lib/rolePermissions';

function checkHouseholdPermission(session: any, permission: string): boolean {
  if (!session?.user) return false;
  const user = session.user as any;
  const role = (user.role || '').toLowerCase();

  if (['admin', 'super_admin', 'manager'].includes(role)) return true;

  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.some((r: any) => {
    const name = (typeof r === 'string' ? r : r?.name || '').toLowerCase();
    return ['admin', 'super_admin', 'manager'].includes(name);
  })) {
    return true;
  }

  const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes(permission)) return true;

  const roleDefaults = ROLE_PERMISSIONS[role] || [];
  if (roleDefaults.includes(permission)) return true;

  if (
    permission === PERMISSIONS.HOUSEHOLDS_READ &&
    (permissions.includes(PERMISSIONS.FARMERS_READ) || permissions.includes(PERMISSIONS.DASHBOARD_ACCESS))
  ) {
    return true;
  }

  if (
    permission === PERMISSIONS.HOUSEHOLDS_UPDATE &&
    permissions.includes(PERMISSIONS.FARMERS_UPDATE)
  ) {
    return true;
  }

  if (
    permission === PERMISSIONS.HOUSEHOLDS_DELETE &&
    permissions.includes(PERMISSIONS.FARMERS_DELETE)
  ) {
    return true;
  }

  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkHouseholdPermission(session, PERMISSIONS.HOUSEHOLDS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    return NextResponse.json(household);
  } catch (error: any) {
    console.error('Error fetching household:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkHouseholdPermission(session, PERMISSIONS.HOUSEHOLDS_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.household.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    const updated = await prisma.household.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating household:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkHouseholdPermission(session, PERMISSIONS.HOUSEHOLDS_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.household.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Household deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting household:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
