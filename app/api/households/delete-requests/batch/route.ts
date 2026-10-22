import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// POST /api/households/delete-requests/batch — batch approve or reject multiple requests
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action, adminNotes } = body; // action: 'approve' | 'reject'

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
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

    // Fetch all PENDING requests matching the given ids
    const pendingRequests = await prisma.householdDeleteRequest.findMany({
      where: { id: { in: ids }, status: 'PENDING' },
      select: { id: true, householdId: true },
    });

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // If approving, delete all the associated households
    if (action === 'approve') {
      const householdIdsToDelete = pendingRequests
        .map((r) => r.householdId)
        .filter((hid): hid is string => hid !== null);

      if (householdIdsToDelete.length > 0) {
        await prisma.household.deleteMany({
          where: { id: { in: householdIdsToDelete } },
        });
      }
    }

    // Bulk-update status on all pending requests
    const processedIds = pendingRequests.map((r) => r.id);
    await prisma.householdDeleteRequest.updateMany({
      where: { id: { in: processedIds } },
      data: {
        status: newStatus,
        reviewedByUserId: reviewingUser.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null,
      },
    });

    const skipped = ids.length - processedIds.length;

    return NextResponse.json({
      success: true,
      processed: processedIds.length,
      skipped,
      message: `${processedIds.length} household request(s) ${newStatus.toLowerCase()}${skipped > 0 ? `, ${skipped} skipped (not pending)` : ''}`,
    });
  } catch (error: any) {
    console.error('Error batch processing household delete requests:', error);
    return NextResponse.json({ error: error.message || 'Failed to batch process delete requests' }, { status: 500 });
  }
}
