import { NextRequest, NextResponse } from 'next/server';
import { BusinessStakeholderStatus, KYBStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const stringArray = z.array(z.string().min(1)).default([]);

const applicationSchema = z.object({
  businessName: z.string().min(2).max(200),
  businessType: z.string().min(2).max(100),
  registrationNumber: z.string().max(80).optional().nullable(),
  tin: z.string().max(80).optional().nullable(),
  contactName: z.string().min(2).max(160),
  contactRole: z.string().max(120).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  lga: z.string().max(120).optional().nullable(),
  interests: stringArray.refine((items) => items.length > 0, 'Select at least one interest area'),
  valueChainRoles: stringArray,
  targetCrops: stringArray,
  targetStates: stringArray,
  targetLGAs: stringArray,
  servicesOffered: z.string().max(1500).optional().nullable(),
  capacitySummary: z.string().max(1500).optional().nullable(),
  expectedEngagement: z.string().max(1500).optional().nullable(),
  applicationType: z.string().max(100).default('Partnership'),
  applicationTitle: z.string().max(160).optional().nullable(),
  applicationDescription: z.string().max(2000).optional().nullable(),
  expectedFarmerReach: z.coerce.number().int().positive().optional().nullable(),
  documentUrls: stringArray.optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const hasKybSeed = Boolean(data.registrationNumber || data.tin);
  const stakeholderData: Prisma.BusinessStakeholderCreateInput = {
    businessName: data.businessName.trim(),
    businessType: data.businessType,
    registrationNumber: data.registrationNumber || null,
    tin: data.tin || null,
    contactName: data.contactName.trim(),
    contactRole: data.contactRole || null,
    email: data.email.toLowerCase().trim(),
    phone: data.phone || null,
    website: data.website || null,
    address: data.address || null,
    state: data.state || null,
    lga: data.lga || null,
    interests: data.interests,
    valueChainRoles: data.valueChainRoles,
    targetCrops: data.targetCrops,
    targetStates: data.targetStates,
    targetLGAs: data.targetLGAs,
    servicesOffered: data.servicesOffered || null,
    capacitySummary: data.capacitySummary || null,
    expectedEngagement: data.expectedEngagement || null,
    status: hasKybSeed ? BusinessStakeholderStatus.KYB_PENDING : BusinessStakeholderStatus.NEW,
    kybStatus: hasKybSeed ? KYBStatus.SUBMITTED : KYBStatus.NOT_SUBMITTED,
    kyb: hasKybSeed
      ? {
          create: {
            cacNumber: data.registrationNumber || null,
            tin: data.tin || null,
            status: KYBStatus.SUBMITTED,
            documentUrls: data.documentUrls || [],
          },
        }
      : undefined,
    applications: {
      create: {
        applicationType: data.applicationType,
        title: data.applicationTitle || `${data.businessName} partnership request`,
        description: data.applicationDescription || data.expectedEngagement || null,
        requestedSupport: data.expectedEngagement || null,
        targetCrops: data.targetCrops,
        targetLocations: [...data.targetStates, ...data.targetLGAs],
        expectedFarmerReach: data.expectedFarmerReach || null,
      },
    },
  };

  const stakeholder = await prisma.businessStakeholder.create({
    data: stakeholderData,
    select: { id: true, businessName: true, status: true, kybStatus: true, createdAt: true },
  });

  return NextResponse.json(
    {
      message: 'Agri-business application submitted successfully.',
      stakeholder,
    },
    { status: 201 }
  );
}
