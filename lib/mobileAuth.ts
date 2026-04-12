/**
 * mobileAuth.ts
 * Shared auth helper for all /api/mobile/* routes.
 * Verifies the Firebase Bearer token, looks up the FIMS user, and
 * optionally enforces a role allowlist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from './firebase-admin';
import prisma from './prisma';

export interface MobileUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
}

type AuthSuccess = { user: MobileUser };
type AuthFailure = { error: NextResponse };

export async function getMobileUser(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 }),
    };
  }

  const token = authHeader.slice(7);

  let firebaseUid: string;
  let email: string | undefined;

  try {
    const decoded = await verifyFirebaseToken(token);
    firebaseUid = decoded.uid;
    email = decoded.email;
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    };
  }

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
      role: true,
      isActive: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'No FIMS account found. Contact your administrator.' },
        { status: 404 }
      ),
    };
  }

  if (!user.isActive) {
    return {
      error: NextResponse.json(
        { error: 'Account is deactivated. Contact your administrator.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/**
 * Returns a 403 NextResponse if user's role is not in the allowed list,
 * or null if the check passes.
 */
export function requireRole(user: MobileUser, ...allowedRoles: string[]): NextResponse | null {
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: `Access denied. Required role: ${allowedRoles.join(' or ')}.` },
      { status: 403 }
    );
  }
  return null;
}
