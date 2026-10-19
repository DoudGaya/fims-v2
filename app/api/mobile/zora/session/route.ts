import { NextRequest, NextResponse } from 'next/server';
import { getMobileUser } from '@/lib/mobileAuth';
import { hasZoraAccess, issueZoraAssertion } from '@/lib/zoraAccess';

export async function POST(req: NextRequest) {
  const auth = await getMobileUser(req);
  if ('error' in auth) return auth.error;
  // Only the authenticated agent's own identity can be exchanged here.
  const subject = { type: 'agent' as const, id: auth.user.id };
  try {
    if (!(await hasZoraAccess(subject))) return NextResponse.json({ error: 'Ask your FIMS administrator to enable Zora for your account.' }, { status: 403 });
    return NextResponse.json({ assertion: issueZoraAssertion(subject), expiresIn: 120 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Zora access is temporarily unavailable' }, { status: 503 }); }
}
