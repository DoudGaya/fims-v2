import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check update permission
    if (!(await hasPermission((session.user as any).id, PERMISSIONS.USERS_UPDATE))) {
      return NextResponse.json({ error: 'Insufficient permissions to update users' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      displayName,
      firstName,
      lastName,
      email,
      role, // This is the role ID for RBAC
      isActive,
      password,
      sendPasswordEmail = false
    } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash password if provided
    let hashedPassword = undefined;
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
      }
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Email already taken by another user' }, { status: 400 });
      }
    }

    const roleRecord = role
      ? await prisma.roles.findUnique({ where: { id: role } })
      : null;

    if (role && !roleRecord) {
      return NextResponse.json({ error: 'Role not found' }, { status: 400 });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        displayName,
        firstName,
        lastName,
        email,
        isActive,
        ...(roleRecord && { role: roleRecord.name }),
        ...(hashedPassword && { password: hashedPassword }),
      }
    });

    // Add the requested role if missing. Do not delete existing role links here:
    // production role cleanup should be a deliberate admin/backfill task.
    if (roleRecord) {
      await prisma.user_roles.upsert({
        where: { userId_roleId: { userId: id, roleId: roleRecord.id } },
        update: {},
        create: {
          userId: id,
          roleId: roleRecord.id
        },
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check delete permission
    if (!(await hasPermission((session.user as any).id, PERMISSIONS.USERS_DELETE))) {
      return NextResponse.json({ error: 'Insufficient permissions to delete users' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting self
    if (id === (session.user as any).id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
