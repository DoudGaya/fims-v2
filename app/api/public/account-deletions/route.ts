import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const deleteRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  nin: z.string().min(11, 'NIN must be 11 digits').max(11, 'NIN must be 11 digits'),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = deleteRequestSchema.parse(body);

    const deletionRequest = await prisma.accountDeleteRequest.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        nin: validatedData.nin,
        reason: validatedData.reason,
      },
    });

    return NextResponse.json(
      { message: 'Deletion request submitted successfully', request: deletionRequest },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error submitting deletion request:', error);
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}
