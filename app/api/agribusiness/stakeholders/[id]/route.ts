import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { BusinessStakeholderStatus, KYBStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { PERMISSIONS } from '@/lib/permissions';
import { resolveSessionPermissions, type SessionUserPermissions } from '@/lib/sessionPermissions';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  status: z.nativeEnum(BusinessStakeholderStatus).optional(),
  kybStatus: z.nativeEnum(KYBStatus).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

function canUpdateAgriBusiness(permissions?: string[]) {
  return permissions?.includes(PERMISSIONS.AGRIBUSINESS_UPDATE) || false;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const permissions = await resolveSessionPermissions(session?.user as SessionUserPermissions | undefined);
  if (!session || !canUpdateAgriBusiness(permissions)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: session ? 403 : 401 });
  }

  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const updateData: Prisma.BusinessStakeholderUpdateInput = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.kybStatus !== undefined) updateData.kybStatus = parsed.data.kybStatus;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const stakeholder = await prisma.businessStakeholder.update({
    where: { id },
    data: updateData,
    include: {
      kyb: true,
      applications: { orderBy: { createdAt: 'desc' }, take: 2 },
      agreements: { orderBy: { createdAt: 'desc' }, take: 2 },
      _count: { select: { applications: true, agreements: true, outreachPlans: true } },
    },
  });

  return NextResponse.json({ stakeholder });
}
