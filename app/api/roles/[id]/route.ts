import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.ROLES_READ)) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const role = await prisma.roles.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.ROLES_UPDATE)) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, permissions, isActive } = body;

    const role = await prisma.roles.findUnique({ where: { id } });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 403 });
    }

    const updatedRole = await prisma.roles.update({
      where: { id },
      data: {
        name,
        description,
        permissions,
        isActive
      }
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.ROLES_DELETE)) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const role = await prisma.roles.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: { userRoles: true }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 });
    }

    if (role._count.userRoles > 0) {
      return NextResponse.json({ error: 'Cannot delete role assigned to users' }, { status: 400 });
    }

    await prisma.roles.delete({ where: { id } });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
