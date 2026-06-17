import { NextRequest, NextResponse } from 'next/server';
import ProductionLogger from '@/lib/productionLogger';
import { hasNINConfig, lookupNINFromProvider, toNINErrorPayload } from '@/lib/ninProvider';

async function handleLookup(nin: string | null) {
  try {
    if (!nin) {
      return NextResponse.json({ error: 'NIN is required' }, { status: 400 });
    }

    if (!hasNINConfig()) {
      ProductionLogger.warn('NIN API not configured');
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            firstname: 'Test',
            lastname: 'User',
            nin,
          },
        });
      }
      return NextResponse.json({ error: 'NIN verification service unavailable' }, { status: 503 });
    }

    const result = await lookupNINFromProvider(nin);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    ProductionLogger.error('Temp NIN lookup error:', error.message);
    const { body, status } = toNINErrorPayload(error, 'Failed to lookup NIN');
    return NextResponse.json(body, { status });
  }
}

export async function GET(req: NextRequest) {
  return handleLookup(req.nextUrl.searchParams.get('nin'));
}

export async function POST(req: NextRequest) {
  let body: { nin?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  return handleLookup(body.nin ?? null);
}
