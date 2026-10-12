import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getMobileUser } from '@/lib/mobileAuth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = ['nin', 'phone', 'email', 'bvn'] as const;
type AllowedField = typeof ALLOWED_FIELDS[number];

async function resolveAuthUser(req: NextRequest) {
  // 1. Mobile Bearer Auth (Firebase)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const mobileAuth = await getMobileUser(req);
    if (!('error' in mobileAuth)) {
      return mobileAuth.user;
    }
  }

  // 2. NextAuth Web Session
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return session.user;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { field, value, excludeId } = body;

    if (!field || !value || typeof value !== 'string' || !value.trim()) {
      return NextResponse.json({ exists: false, record: null });
    }

    const normalizedField = field.toLowerCase().trim() as AllowedField;
    if (!ALLOWED_FIELDS.includes(normalizedField)) {
      return NextResponse.json(
        { error: `Field must be one of: ${ALLOWED_FIELDS.join(', ')}` },
        { status: 400 }
      );
    }

    const trimmedValue = value.trim();

    const whereClause: any = {
      [normalizedField]: trimmedValue,
    };

    if (excludeId) {
      whereClause.id = { not: excludeId };
    }

    const existing = await prisma.farmer.findFirst({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        state: true,
        lga: true,
        status: true,
        createdAt: true,
      },
    });

    const sanitizedRecord = existing
      ? {
          id: existing.id,
          name: `${existing.firstName || ''} ${existing.lastName || ''}`.trim() || 'Existing Farmer',
          state: existing.state,
          lga: existing.lga,
          status: existing.status || 'Active',
          createdAt: existing.createdAt ? existing.createdAt.toISOString().split('T')[0] : null,
        }
      : null;

    return NextResponse.json({
      exists: !!existing,
      record: sanitizedRecord,
    });
  } catch (error: any) {
    console.error('Check duplicate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

