import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendApiAccessRequestNotification } from '@/lib/emailService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const VALID_SCOPES = ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read'] as const;

const requestSchema = z.object({
  organizationName: z.string().min(2, 'Organisation name is required').max(200),
  contactName: z.string().min(2, 'Contact name is required').max(200),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(30).optional().nullable(),
  intendedUse: z.string().min(20, 'Please provide more detail about your intended use').max(2000),
  requestedScopes: z.array(z.enum(VALID_SCOPES)).min(1, 'At least one scope is required'),
  expectedVolume: z.string().max(100).optional().nullable(),
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

  const { organizationName, contactName, email, phone, intendedUse, requestedScopes, expectedVolume } =
    parsed.data;

  const record = await prisma.apiAccessRequest.create({
    data: {
      organizationName,
      contactName,
      email,
      phone: phone ?? null,
      intendedUse,
      requestedScopes,
      expectedVolume: expectedVolume ?? null,
    },
    select: { id: true, createdAt: true },
  });

  // Fire-and-forget email notification — don't fail the request if email fails
  sendApiAccessRequestNotification({
    organizationName,
    contactName,
    email,
    phone,
    intendedUse,
    requestedScopes: [...requestedScopes],
    expectedVolume,
    requestId: record.id,
  }).catch((err) => console.error('Failed to send API access request notification:', err));

  return NextResponse.json(
    {
      message: 'Access request submitted. Our team will be in touch within 2–3 business days.',
      id: record.id,
    },
    { status: 201 }
  );
}
