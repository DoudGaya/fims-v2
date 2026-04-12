import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/auth/me
 * Verifies a Firebase ID token from the mobile app and returns the
 * corresponding FIMS user profile (role, name, active status).
 * Used by the mobile app after Firebase login to enrich the session.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or malformed Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  let firebaseUid: string;
  let email: string | undefined;

  try {
    const decoded = await verifyFirebaseToken(token);
    firebaseUid = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired Firebase token' }, { status: 401 });
  }

  // Look up the FIMS user — prefer firebaseUid match, fall back to email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { firebaseUid },
        ...(email ? [{ email }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
      isActive: true,
      firebaseUid: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'No FIMS account found. Contact your administrator.' },
      { status: 404 }
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: 'Account is deactivated. Contact your administrator.' },
      { status: 403 }
    );
  }

  // Lazily link firebaseUid if it wasn't stored yet (handles existing users)
  if (!user.firebaseUid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid },
    });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    role: user.role,
  });
}
