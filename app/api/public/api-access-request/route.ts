import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendApiAccessRequestNotification } from '@/lib/emailService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = [
  'farmers:read',
  'farms:read',
  'clusters:read',
  'analytics:read',
  'nin:verify',
] as const;

const requestSchema = z.object({
  organizationName: z.string().min(2, 'Organisation name is required').max(200),
  rcNumber: z.string().max(50).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  organizationType: z.string().max(100).optional().nullable(),
  website: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  contactName: z.string().min(2, 'Contact name is required').max(200),
  designation: z.string().max(100).optional().nullable(),
  email: z.string().email('Valid corporate email is required'),
  phone: z.string().max(30).optional().nullable(),
  intendedUse: z.string().min(15, 'Please provide more detail about your intended use and justification').max(3000),
  requestedScopes: z.array(z.enum(VALID_SCOPES)).min(1, 'At least one data scope is required'),
  expectedVolume: z.string().max(100).optional().nullable(),
  integrationTimeline: z.string().max(100).optional().nullable(),
  complianceAgreed: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const record = await prisma.apiAccessRequest.create({
    data: {
      organizationName: data.organizationName,
      contactName: data.contactName,
      email: data.email.toLowerCase().trim(),
      phone: data.phone ?? null,
      intendedUse: data.intendedUse,
      requestedScopes: data.requestedScopes,
      expectedVolume: data.expectedVolume ?? null,
      rcNumber: data.rcNumber ?? null,
      taxId: data.taxId ?? null,
      organizationType: data.organizationType ?? null,
      website: data.website ?? null,
      designation: data.designation ?? null,
      address: data.address ?? null,
      integrationTimeline: data.integrationTimeline ?? null,
      complianceAgreed: data.complianceAgreed ?? true,
      status: 'PENDING',
    },
    select: { id: true, createdAt: true },
  });

  // Fire-and-forget email notification to admin team
  sendApiAccessRequestNotification({
    organizationName: data.organizationName,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    intendedUse: data.intendedUse,
    requestedScopes: [...data.requestedScopes],
    expectedVolume: data.expectedVolume,
    requestId: record.id,
  }).catch((err) => console.error('Failed to send API access request notification:', err));

  return NextResponse.json(
    {
      message: 'Access request submitted successfully. Our compliance and administration team will review your application and send your access credentials upon approval.',
      id: record.id,
    },
    { status: 201 }
  );
}
