import { NextRequest, NextResponse } from 'next/server';
import { BusinessStakeholderStatus, KYBStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';

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
  state: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  pollingUnit: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  documentUrls: z.array(z.string()).optional().default([]),
  servicesOffered: z.string().optional().nullable(),
  interests: stringArray.refine((items) => items.length > 0, 'Select at least one interest area'),
});

/**
 * GET /api/mobile/agribusiness
 * List agribusiness leads captured by the mobile agent.
 */
export async function GET(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agri_business_agent', 'admin');
  if (roleError) return roleError;

  const sp = req.nextUrl.searchParams;
  const page  = Math.max(1, parseInt(sp.get('page')  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
  const skip  = (page - 1) * limit;

  const where: Prisma.BusinessStakeholderWhereInput = {};

  if (user.role === 'agri_business_agent') {
    where.createdByUserId = user.id;
  }

  const [stakeholders, total] = await Promise.all([
    prisma.businessStakeholder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        businessType: true,
        contactName: true,
        email: true,
        phone: true,
        interests: true,
        status: true,
        kybStatus: true,
        createdAt: true,
      }
    }),
    prisma.businessStakeholder.count({ where }),
  ]);

  return NextResponse.json({
    stakeholders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/mobile/agribusiness
 * Create a new agribusiness lead from the mobile app.
 */
export async function POST(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agri_business_agent', 'admin');
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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

  const stakeholder = await prisma.businessStakeholder.create({
    data: {
      businessName: data.businessName.trim(),
      businessType: data.businessType,
      registrationNumber: data.registrationNumber || null,
      tin: data.tin || null,
      contactName: data.contactName.trim(),
      contactRole: data.contactRole || null,
      email: data.email.toLowerCase().trim(),
      phone: data.phone || null,
      state: data.state || null,
      lga: data.lga || null,
      ward: data.ward || null,
      pollingUnit: data.pollingUnit || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      servicesOffered: data.servicesOffered || null,
      interests: data.interests,
      status: hasKybSeed ? BusinessStakeholderStatus.KYB_PENDING : BusinessStakeholderStatus.NEW,
      kybStatus: hasKybSeed ? KYBStatus.SUBMITTED : KYBStatus.NOT_SUBMITTED,
      createdByUserId: user.id, // Link to the mobile agent
      kyb: hasKybSeed
        ? {
            create: {
              cacNumber: data.registrationNumber || null,
              tin: data.tin || null,
              documentUrls: data.documentUrls && data.documentUrls.length > 0 ? data.documentUrls : [],
              status: KYBStatus.SUBMITTED,
            },
          }
        : undefined,
      applications: {
        create: {
          applicationType: 'Partnership',
          title: `${data.businessName} - Mobile Lead`,
          description: 'Captured via Mobile Agent App',
        },
      },
    },
    select: { id: true, businessName: true, status: true, kybStatus: true, createdAt: true },
  });

  return NextResponse.json(
    {
      message: 'Agri-business lead submitted successfully.',
      stakeholder,
    },
    { status: 201 }
  );
}
