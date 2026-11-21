import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/households/[id]
 * Full record including photos (used by the detail screen only).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await getMobileUser(req);
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    const roleError = requireRole(user, 'household_agent', 'agent', 'field_agent', 'admin', 'manager');
    if (roleError) return roleError;

    const { id } = await params;
    const isScoped = !['admin', 'manager'].includes(user.role);

    const household = await prisma.household.findFirst({
      where: { id, ...(isScoped ? { agentId: user.id } : {}) },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }
    return NextResponse.json({ household });
  } catch (error: any) {
    console.error('Error fetching mobile household:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
