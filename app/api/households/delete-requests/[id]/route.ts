import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// PATCH /api/households/delete-requests/[id] — approve or reject a single request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, adminNotes } = body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const reviewingUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    if (!reviewingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleteRequest = await prisma.householdDeleteRequest.findUnique({ where: { id } });
    if (!deleteRequest) {
      return NextResponse.json({ error: 'Delete request not found' }, { status: 404 });
    }
    if (deleteRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request has already been ${deleteRequest.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // If approving, delete the household record
    if (action === 'approve' && deleteRequest.householdId) {
      const householdExists = await prisma.household.findUnique({ where: { id: deleteRequest.householdId } });
      if (householdExists) {
        await prisma.household.delete({ where: { id: deleteRequest.householdId } });
      }
    }

    const updated = await prisma.householdDeleteRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedByUserId: reviewingUser.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null,
      },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ deleteRequest: updated });
  } catch (error: any) {
    console.error('Error processing household delete request:', error);
    return NextResponse.json({ error: error.message || 'Failed to process delete request' }, { status: 500 });
  }
}

// GET /api/households/delete-requests/[id] — get single request
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const deleteRequest = await prisma.householdDeleteRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        household: true,
      },
    });

    if (!deleteRequest) {
      return NextResponse.json({ error: 'Delete request not found' }, { status: 404 });
    }

    return NextResponse.json({ deleteRequest });
  } catch (error: any) {
    console.error('Error fetching household delete request:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch delete request' }, { status: 500 });
  }
}
