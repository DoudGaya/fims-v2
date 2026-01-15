import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/emailService';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = forgotPasswordSchema.parse(body);
    const { email } = validatedData;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({ 
        message: 'If an account with that email exists, we\'ve sent password reset instructions.' 
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return NextResponse.json({ 
        message: 'If an account with that email exists, we\'ve sent password reset instructions.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { email },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry,
      },
    });

    // Send password reset email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await sendPasswordResetEmail(email, resetToken, user.displayName || user.firstName || 'User');
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Still return success but log the error
      }
    } else {
      console.warn('SMTP not configured. Password reset token generated but email not sent.');
      console.log(`Reset URL: ${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`);
    }

    return NextResponse.json({ 
      message: 'Password reset instructions have been sent to your email address.',
      // In development, include the token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl: `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}` })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.format() 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
