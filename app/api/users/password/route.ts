import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json({ 
        error: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      }, { status: 400 });
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { id: true, password: true }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid current password' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        passwordChangeRequired: false
      }
    });

    return NextResponse.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
