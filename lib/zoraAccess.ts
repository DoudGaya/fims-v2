import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export type ZoraSubject = { type: 'farmer' | 'agent'; id: string };
export function integrationEnabled() { return process.env.ZORA_INTEGRATION_ENABLED === 'true'; }
export function integrationSecret() {
  const secret = process.env.ZORA_FIMS_SHARED_SECRET;
  if (!secret || secret.length < 32) throw new Error('Zora integration is not configured');
  return secret;
}
export function signature(value: string) {
  return createHmac('sha256', integrationSecret()).update(value).digest('base64url');
}
export function validSignature(value: string, supplied: string) {
  const expected = Buffer.from(signature(value));
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(expected, actual);
}
export async function zoraAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, isActive: true } });
  return user?.isActive && user.role === 'admin' ? user : null;
}
export async function subjectExists(subject: ZoraSubject) {
  if (subject.type === 'farmer') return Boolean(await prisma.farmer.findUnique({ where: { id: subject.id }, select: { id: true } }));
  const user = await prisma.user.findUnique({ where: { id: subject.id }, select: { role: true, isActive: true } });
  return Boolean(user?.isActive && ['agent','data_correction_agent','survey_agent','agri_business_agent'].includes(user.role));
}
export async function hasZoraAccess(subject: ZoraSubject) {
  if (!integrationEnabled() || !(await subjectExists(subject))) return false;
  const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`
    SELECT enabled FROM zora_access_grants WHERE subject_type = ${subject.type} AND subject_id = ${subject.id}`;
  return rows[0]?.enabled === true;
}
export function parseSubject(body: unknown): ZoraSubject | null {
  if (!body || typeof body !== 'object') return null;
  const { type, id } = body as Record<string, unknown>;
  return (type === 'farmer' || type === 'agent') && typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id) ? { type, id } : null;
}
export function issueZoraAssertion(subject: ZoraSubject) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: 'fims', aud: 'zora', sub: `${subject.type}:${subject.id}`, iat: now, exp: now + 120, jti: randomUUID() })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
