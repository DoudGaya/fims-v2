import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { integrationEnabled, parseSubject, subjectExists, zoraAdmin } from '@/lib/zoraAccess';

export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  if (!(await zoraAdmin())) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  if (!integrationEnabled()) return NextResponse.json({ available: false });
  const subject = parseSubject(Object.fromEntries(req.nextUrl.searchParams));
  if (!subject) return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
  try {
    const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`SELECT enabled FROM zora_access_grants WHERE subject_type = ${subject.type} AND subject_id = ${subject.id}`;
    return NextResponse.json({ available: true, enabled: rows[0]?.enabled === true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Zora access storage is unavailable' }, { status: 503 }); }
}
export async function PUT(req: NextRequest) {
  const admin = await zoraAdmin();
  if (!admin) return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
  if (!integrationEnabled()) return NextResponse.json({ error: 'Integration is not enabled' }, { status: 503 });
  // Cookie-authenticated mutations must originate from this dashboard.
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const subject = parseSubject(body);
  if (!subject || typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'Invalid access grant' }, { status: 400 });
  if (!(await subjectExists(subject))) return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 });
  try {
    await prisma.$transaction([
      prisma.$executeRaw`INSERT INTO zora_access_grants(subject_type,subject_id,enabled,updated_by) VALUES (${subject.type},${subject.id},${body.enabled},${admin.id}) ON CONFLICT(subject_type,subject_id) DO UPDATE SET enabled=EXCLUDED.enabled,updated_by=EXCLUDED.updated_by,updated_at=now()`,
      prisma.$executeRaw`INSERT INTO zora_access_events(subject_type,subject_id,enabled,actor_id) VALUES (${subject.type},${subject.id},${body.enabled},${admin.id})`,
    ]);
    return NextResponse.json({ enabled: body.enabled });
  } catch { return NextResponse.json({ error: 'Access could not be updated. Please retry.' }, { status: 503 }); }
}
