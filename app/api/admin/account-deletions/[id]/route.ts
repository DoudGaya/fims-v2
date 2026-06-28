import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  adminNotes: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, adminNotes } = updateSchema.parse(body);

    const updatedRequest = await prisma.accountDeleteRequest.update({
      where: { id: params.id },
      data: {
        status,
        adminNotes,
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // If APPROVED, we might want to automatically deactivate the user based on NIN or Phone.
    // For now, this is an administrative workflow so we'll just update the status.
    // The admin will manually deactivate or delete the associated records if needed,
    // or we could add logic here to find Agent/User by NIN and set isActive = false.

    if (status === 'APPROVED') {
      const agent = await prisma.agent.findFirst({
        where: { nin: updatedRequest.nin }
      });
      if (agent) {
        await prisma.user.update({
          where: { id: agent.userId },
          data: { isActive: false }
        });
      }
    }

    return NextResponse.json({ message: 'Status updated', request: updatedRequest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Error updating deletion request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
