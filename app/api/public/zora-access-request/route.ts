import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendZoraAccessRequestNotification } from '@/lib/emailService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(120),
  email: z.string().email('Valid email is required'),
  organizationName: z.string().min(2, 'Organization name is required').max(200),
  role: z.string().min(2, 'Agricultural role is required').max(100),
  phone: z.string().max(30).optional().nullable(),
  useCase: z.string().min(5, 'Intended use description is required').max(2000),
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

  const { fullName, email, organizationName, role, phone, useCase } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Create or update pending request
  const record = await prisma.zoraAccessRequest.upsert({
    where: { email: normalizedEmail },
    update: {
      fullName,
      organizationName,
      role,
      phone: phone ?? null,
      useCase,
      status: 'PENDING',
      updatedAt: new Date(),
    },
    create: {
      fullName,
      email: normalizedEmail,
      organizationName,
      role,
      phone: phone ?? null,
      useCase,
      status: 'PENDING',
    },
    select: { id: true, createdAt: true },
  });

  // Fire email notification to abdulrahman.dauda@cosmopolitan.edu.ng
  sendZoraAccessRequestNotification({
    fullName,
    email: normalizedEmail,
    organizationName,
    role,
    phone,
    useCase,
    requestId: record.id,
  }).catch((err) => console.error('Failed to send Zora access request notification:', err));

  return NextResponse.json(
    {
      message: 'Access request submitted. Our team will review your application and send your credentials.',
      id: record.id,
    },
    { status: 201 }
  );
}
