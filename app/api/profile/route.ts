import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
export const dynamic = "force-dynamic";
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
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

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, phoneNumber, password, currentPassword } = body;

    const userId = (session.user as any).id;

    // If password change is requested
    if (password) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user || !user.password) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      if (password.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phoneNumber,
          password: hashedPassword
        }
      });
    } else {
      // Just update profile info
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          phoneNumber
        }
      });
    }

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
