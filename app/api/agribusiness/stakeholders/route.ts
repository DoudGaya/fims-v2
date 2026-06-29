import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { BusinessStakeholderStatus, KYBStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { PERMISSIONS } from '@/lib/permissions';
import { resolveSessionPermissions, type SessionUserPermissions } from '@/lib/sessionPermissions';

export const dynamic = 'force-dynamic';

function canReadAgriBusiness(permissions?: string[]) {
  return permissions?.includes(PERMISSIONS.AGRIBUSINESS_READ) || false;
}

function canCreateAgriBusiness(permissions?: string[]) {
  return permissions?.includes(PERMISSIONS.AGRIBUSINESS_CREATE) || false;
}

const createSchema = z.object({
  businessName: z.string().min(2).max(200),
  businessType: z.string().min(2).max(100),
  contactName: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  lga: z.string().max(120).optional().nullable(),
  interests: z.array(z.string()).default([]),
  valueChainRoles: z.array(z.string()).default([]),
  targetCrops: z.array(z.string()).default([]),
  targetStates: z.array(z.string()).default([]),
  servicesOffered: z.string().max(1500).optional().nullable(),
  capacitySummary: z.string().max(1500).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const permissions = await resolveSessionPermissions(session?.user as SessionUserPermissions | undefined);
  if (!session || !canReadAgriBusiness(permissions)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: session ? 403 : 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim();
  const status = searchParams.get('status')?.trim();
  const businessType = searchParams.get('type')?.trim();
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

  const statusValues = Object.values(BusinessStakeholderStatus);
  const where: Prisma.BusinessStakeholderWhereInput = {};
  if (status && status !== 'all' && statusValues.includes(status as BusinessStakeholderStatus)) {
    where.status = status as BusinessStakeholderStatus;
  }
  if (businessType && businessType !== 'all') where.businessType = businessType;
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { businessType: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [stakeholders, total, newCount, activeCount, kybPendingCount, agreementsCount] = await Promise.all([
    prisma.businessStakeholder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        kyb: true,
        applications: { orderBy: { createdAt: 'desc' }, take: 2 },
        agreements: { orderBy: { createdAt: 'desc' }, take: 2 },
        _count: { select: { applications: true, agreements: true, outreachPlans: true } },
      },
    }),
    prisma.businessStakeholder.count({ where }),
    prisma.businessStakeholder.count({ where: { status: BusinessStakeholderStatus.NEW } }),
    prisma.businessStakeholder.count({ where: { status: BusinessStakeholderStatus.ACTIVE } }),
    prisma.businessStakeholder.count({ where: { kybStatus: KYBStatus.SUBMITTED } }),
    prisma.partnershipAgreement.count(),
  ]);

  return NextResponse.json({
    stakeholders,
    stats: {
      total,
      new: newCount,
      active: activeCount,
      kybPending: kybPendingCount,
      agreements: agreementsCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const permissions = await resolveSessionPermissions(session?.user as SessionUserPermissions | undefined);
  if (!session || !canCreateAgriBusiness(permissions)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: session ? 403 : 401 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const stakeholderData: Prisma.BusinessStakeholderCreateInput = {
    businessName: data.businessName.trim(),
    businessType: data.businessType,
    contactName: data.contactName.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone || null,
    state: data.state || null,
    lga: data.lga || null,
    interests: data.interests,
    valueChainRoles: data.valueChainRoles,
    targetCrops: data.targetCrops,
    targetStates: data.targetStates,
    targetLGAs: [],
    servicesOffered: data.servicesOffered || null,
    capacitySummary: data.capacitySummary || null,
    status: BusinessStakeholderStatus.NEW,
    kybStatus: KYBStatus.NOT_SUBMITTED,
  };

  const stakeholder = await prisma.businessStakeholder.create({
    data: stakeholderData,
  });

  return NextResponse.json({ stakeholder }, { status: 201 });
}
