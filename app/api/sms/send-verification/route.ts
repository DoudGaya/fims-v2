import { NextRequest, NextResponse } from 'next/server';
import ProductionLogger from '@/lib/productionLogger';
import TermiiService from '@/lib/termiiService';

// Phone number formatting utilities
function formatNigerianPhoneNumber(phoneNumber: string) {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // If number starts with 0, replace with +234
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.substring(1)}`;
  }
  
  // If number starts with 234, add +
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  
  // If number starts with +234, return as is
  if (phoneNumber.startsWith('+234')) {
    return phoneNumber;
  }
  
  // Default: assume it's a Nigerian number without country code
  return `+234${cleaned}`;
}

function isValidNigerianPhoneNumber(phoneNumber: string) {
  // Nigerian numbers: +234 followed by 10 digits starting with 7, 8, or 9
  const nigerianPhoneRegex = /^\+234[789][01]\d{8}$/;
  return nigerianPhoneRegex.test(phoneNumber);
}

const termiiService = new TermiiService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Format phone number to ensure it's in international format
    phoneNumber = formatNigerianPhoneNumber(phoneNumber);
    
    // Validate the formatted phone number
    if (!isValidNigerianPhoneNumber(phoneNumber)) {
      return NextResponse.json({ 
        error: 'Invalid Nigerian phone number format',
        provided: body.phoneNumber,
        formatted: phoneNumber,
        expectedFormat: '+234XXXXXXXXXX (starting with 7, 8, or 9)'
      }, { status: 400 });
    }

    ProductionLogger.debug('Attempting to send SMS verification', { 
      originalNumber: body.phoneNumber,
      formattedNumber: phoneNumber,
      lastFourDigits: phoneNumber.slice(-4) 
    });

    // Use Termii as primary SMS provider (Twilio not installed in this environment)
    try {
      ProductionLogger.debug('Using Termii as SMS provider');
      const termiiResult = await termiiService.sendVerificationCode(phoneNumber);

      ProductionLogger.debug('Termii SMS sent successfully', { 
        verificationId: termiiResult.verificationId 
      });

      return NextResponse.json({
        success: true,
        verificationId: termiiResult.verificationId,
        status: termiiResult.status,
        provider: 'termii',
        message: 'SMS sent successfully'
      });

    } catch (termiiError: any) {
      ProductionLogger.error('Termii SMS failed', { 
        termiiError: termiiError.message 
      });

      return NextResponse.json({ 
        error: 'SMS service temporarily unavailable. Please try again later.',
        details: {
          provider: 'termii_failed',
          error: termiiError.message
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    ProductionLogger.error('SMS verification error:', error.message);
    
    return NextResponse.json({ 
      error: 'Failed to send SMS verification code',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
