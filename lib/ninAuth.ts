import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireApiKey } from '@/lib/api-key-auth';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

/**
 * Authorize incoming requests to NIN validation endpoints.
 * Supports:
 *  1. External/Departmental API Keys via X-API-Key or Authorization: Bearer fims_live_... (requires "nin:verify" scope)
 *  2. CCSA Mobile Agents via Firebase ID Token (Authorization: Bearer <token>)
 *  3. Logged-in Web Admin/Staff via NextAuth Session
 */
export async function authorizeNINRequest(
  req: NextRequest
): Promise<{ authorized: true; identity?: string } | NextResponse> {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';

  // 1. FIMS API Key (External integrations, other departments, partner servers)
  if (apiKeyHeader.startsWith('fims_') || authHeader.startsWith('Bearer fims_')) {
    const authResult = await requireApiKey(req, 'nin:verify');
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    return { authorized: true, identity: `apikey:${authResult.apiKey.name}` };
  }

  // 2. CCSA Mobile Agent (Firebase Auth token)
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const decoded = await verifyFirebaseToken(token);
        return { authorized: true, identity: `agent:${decoded.uid}` };
      } catch {
        // Fall through to other checks or rejection
      }
    }
  }

  // 3. FIMS Dashboard Session (logged-in internal staff)
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      return { authorized: true, identity: `user:${session.user.email}` };
    }
  } catch {
    // Session check failed or absent
  }

  // 4. Explicit local test bypass only when explicitly enabled in environment
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_LOCAL_DEV_BYPASS === 'true') {
    return { authorized: true, identity: 'dev-local-bypass' };
  }

  return NextResponse.json(
    {
      error: 'Unauthorized',
      message:
        'Access to the NIN Validation API requires an authorized API Key (X-API-Key: fims_live_...) or an active CCSA Agent token.',
      docs: 'https://fims.cosmopolitan.edu.ng/docs',
    },
    { status: 401 }
  );
}

