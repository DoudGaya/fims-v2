import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, pinId } = body;

    if (!email || !code || !pinId) {
      return NextResponse.json({ error: 'Email, code, and pinId are required' }, { status: 400 });
    }

    const storedCode = await redis.get(`email_otp:${pinId}`);

    if (!storedCode) {
      return NextResponse.json({ error: 'OTP has expired or does not exist' }, { status: 400 });
    }

    if (storedCode.toString() !== code.toString()) {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
    }

    // Success! Delete the OTP
    await redis.del(`email_otp:${pinId}`);

    return NextResponse.json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
