import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: add permission check here if necessary

    const requests = await prisma.accountDeleteRequest.findMany({
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' }
      ],
      include: {
        reviewedBy: {
          select: { displayName: true, email: true }
        }
      }
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching account deletion requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
