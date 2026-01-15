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

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required for verification' }, { status: 400 });
    }

    ProductionLogger.debug('Verifying SMS code', { 
      phoneNumber: phoneNumber.slice(-4),
      verificationId: verificationId?.slice(0, 10) + '...'
    });

    let verificationResult: any = null;
    let provider = 'unknown';

    // Determine provider based on verificationId format
    if (verificationId && verificationId.startsWith('termii_')) {
      // Verify using Termii
      try {
        ProductionLogger.debug('Verifying code via Termii');
        const isValid = await termiiService.verifyCode(verificationId, code);
        provider = 'termii';

        verificationResult = {
          success: true,
          verified: isValid,
          status: isValid ? 'approved' : 'failed'
        };

        ProductionLogger.debug('Termii verification result', { 
          verified: isValid,
          status: verificationResult.status 
        });

      } catch (error: any) {
        ProductionLogger.error('Termii verification error:', error.message);
        return NextResponse.json({ 
          error: 'Verification service error',
          details: error.message 
        }, { status: 500 });
      }
    } else {
      // Twilio fallback (not implemented as Twilio is not installed)
      // If we had Twilio, we would check it here.
      // Since we don't, we return an error if it's not a Termii ID.
      
      return NextResponse.json({ 
        error: 'Invalid verification ID or provider not supported',
        details: 'Only Termii verification is currently supported'
      }, { status: 400 });
    }

    if (verificationResult.verified) {
      return NextResponse.json({
        success: true,
        verified: true,
        status: 'approved',
        provider,
        message: 'Phone number verified successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        verified: false,
        status: 'pending', // or failed
        provider,
        error: 'Invalid code or code expired'
      }, { status: 400 });
    }

  } catch (error: any) {
    ProductionLogger.error('Verification error:', error.message);
    
    return NextResponse.json({ 
      error: 'Failed to verify code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
