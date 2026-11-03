import { NextRequest, NextResponse } from 'next/server';
import ProductionLogger from '@/lib/productionLogger';
import TermiiService from '@/lib/termiiService';

const termiiService = new TermiiService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { verificationId, code, phoneNumber } = body;

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    if (!phoneNumber && !verificationId) {
      return NextResponse.json({ error: 'Phone number or verification ID is required' }, { status: 400 });
    }

    ProductionLogger.debug('Verifying SMS code', {
      phoneNumber: phoneNumber ? phoneNumber.slice(-4) : 'none',
      verificationId: verificationId?.slice(0, 10) + '...'
    });

    try {
      const isValid = await termiiService.verifyCode(verificationId || '', code, phoneNumber);

      if (isValid) {
        return NextResponse.json({
          success: true,
          verified: true,
          status: 'approved',
          provider: 'termii',
          message: 'Phone number verified successfully'
        });
      } else {
        return NextResponse.json({
          success: false,
          verified: false,
          status: 'failed',
          provider: 'termii',
          error: 'Invalid or expired verification code. Please check and try again.'
        }, { status: 400 });
      }

    } catch (error: any) {
      ProductionLogger.error('Verification error:', error.message);
      return NextResponse.json({
        error: 'Verification service error',
        details: error.message
      }, { status: 500 });
    }

  } catch (error: any) {
    ProductionLogger.error('Verification error:', error.message);

    return NextResponse.json({
      error: 'Failed to verify code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
