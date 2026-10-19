import { NextRequest, NextResponse } from 'next/server';
import { hasZoraAccess, integrationEnabled, parseSubject, validSignature } from '@/lib/zoraAccess';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  if (!integrationEnabled()) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  const timestamp = req.headers.get('x-zora-timestamp') ?? '';
  const sig = req.headers.get('x-zora-signature') ?? '';
  if (!/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 30_000) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const raw = await req.text();
  if (raw.length > 1024) return NextResponse.json({ error: 'Invalid request' }, { status: 413 });
  try {
    if (!validSignature(`${timestamp}.${raw}`, sig)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = JSON.parse(raw);
    if (typeof body.phone === 'string' && /^\+234[789]\d{9}$/.test(body.phone)) {
      const local = `0${body.phone.slice(4)}`;
      const variants = [body.phone, local, body.phone.slice(1)];
      const [farmers, agents] = await Promise.all([
        prisma.farmer.findMany({ where: { phone: { in: variants } }, select: { id: true }, take: 2 }),
        prisma.user.findMany({ where: { phoneNumber: { in: variants }, isActive: true, role: { in: ['agent','data_correction_agent','survey_agent','agri_business_agent'] } }, select: { id: true }, take: 2 }),
      ]);
      const matches = [...farmers.map(row => ({ type: 'farmer' as const, id: row.id })), ...agents.map(row => ({ type: 'agent' as const, id: row.id }))];
      // Shared or duplicate phone numbers must be resolved by an administrator.
      if (matches.length !== 1) return NextResponse.json({ enabled: false }, { headers: { 'Cache-Control': 'no-store' } });
      const subject = matches[0];
      const enabled = await hasZoraAccess(subject);
      return NextResponse.json({ enabled, ...(enabled ? { subject: `${subject.type}:${subject.id}` } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const subject = parseSubject(body);
    if (!subject) return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
    return NextResponse.json({ enabled: await hasZoraAccess(subject), plan: 'fims-sponsored', quota: null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Access verification unavailable' }, { status: 503 }); }
}
