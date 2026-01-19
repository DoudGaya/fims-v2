import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
export const dynamic = "force-dynamic";
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.ROLES_READ)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roles = await prisma.roles.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const systemRoles = roles.filter(role => role.isSystem);
    const customRoles = roles.filter(role => !role.isSystem);

    const allPermissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' }
    });

    return NextResponse.json({
      roles,
      systemRoles,
      customRoles,
      totalRoles: roles.length,
      availablePermissions: allPermissions
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.ROLES_CREATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, permissions, isActive = true } = body;

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existingRole = await prisma.roles.findUnique({
      where: { name }
    });

    if (existingRole) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 400 });
    }

    const role = await prisma.roles.create({
      data: {
        name,
        description,
        permissions: permissions || [],
        isActive,
        createdBy: session.user.email,
        isSystem: false
      }
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
