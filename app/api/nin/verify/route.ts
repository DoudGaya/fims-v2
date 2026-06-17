import { NextRequest, NextResponse } from 'next/server';
import ProductionLogger from '@/lib/productionLogger';
import { hasNINConfig, lookupNINFromProvider, toNINErrorPayload } from '@/lib/ninProvider';

function mapVerifyData(data: any, nin: string) {
  return {
    isValid: true,
    firstName: data.firstname || data.firstName,
    middleName: data.middlename || data.middleName,
    lastName: data.lastname || data.surname || data.lastName,
    dateOfBirth: data.birthdate || data.dateofbirth || data.dateOfBirth,
    gender: data.gender?.toUpperCase() || 'MALE',
    maritalStatus: data.maritalstatus || data.maritalStatus,
    phone: data.telephoneno || data.phone,
    email: data.email,
    photo: data.photo,
    title: data.title,
    religion: data.religion,
    profession: data.profession,
    educationlevel: data.educationlevel,
    nin,
  };
}

async function handleVerify(nin: string | null) {
  try {
    if (!nin) {
      return NextResponse.json({ error: 'NIN is required' }, { status: 400 });
    }

    if (!hasNINConfig()) {
      ProductionLogger.warn('NIN API not configured');
      // Mock response for development if API not configured
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            isValid: true,
            firstName: 'Test',
            lastName: 'User',
            nin: nin,
            gender: 'MALE'
          }
        });
      }
      return NextResponse.json({ error: 'NIN verification service unavailable' }, { status: 503 });
    }

    const result = mapVerifyData(await lookupNINFromProvider(nin), nin);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    ProductionLogger.error('NIN verification error:', error.message);
    const { body, status } = toNINErrorPayload(error, 'Failed to verify NIN');
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: NextRequest) {
  return handleVerify(req.nextUrl.searchParams.get('nin'));
}

export async function POST(req: NextRequest) {
  let body: { nin?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return handleVerify(body.nin ?? null);
}
