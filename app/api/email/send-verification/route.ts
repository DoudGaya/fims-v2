import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const pinId = uuidv4();

    // Store the OTP in Redis, expiring in 10 minutes (600 seconds)
    await redis.set(`email_otp:${pinId}`, otp, { ex: 600 });

    // In a real application, you would send the email via an email provider (Resend, Sendgrid, etc.)
    // For now, we mock the email send and log it to the console
    console.log(`\n========================================`);
    console.log(`✉️ MOCK EMAIL OTP SENT`);
    console.log(`To: ${email}`);
    console.log(`Your OTP is: ${otp}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      pinId,
      to: email,
      smsStatus: 'Message Sent' // kept this similar to termii response
    });
  } catch (error: any) {
    console.error('Email send-verification error:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
