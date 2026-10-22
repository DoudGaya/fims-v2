import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { formatPollingUnit } from '@/lib/textUtils';

// POST /api/households/delete-requests — create a new deletion request for a household
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { householdId, reason } = body;

    if (!householdId || typeof householdId !== 'string') {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    // Check household exists and get snapshot data
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        agent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!household) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    // Check for existing pending request for this household
    const existing = await prisma.householdDeleteRequest.findFirst({
      where: { householdId, status: 'PENDING' },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A pending deletion request already exists for this household' },
        { status: 409 }
      );
    }

    // Get the requesting user record
    const requestingUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    });
    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const householdSnapshot = {
      houseNumber: household.houseNumber,
      headFirstName: household.headFirstName,
      headMiddleName: household.headMiddleName,
      headLastName: household.headLastName,
      headPhone: household.headPhone,
      headPhoneVerified: household.headPhoneVerified,
      headNin: household.headNin,
      headGender: household.headGender,
      state: household.state,
      lga: household.lga,
      ward: household.ward,
      pollingUnit: formatPollingUnit(household.pollingUnit),
      rawPollingUnit: household.pollingUnit,
      address: household.address,
      latitude: household.latitude,
      longitude: household.longitude,
      accuracy: household.accuracy,
      gpsAddress: household.gpsAddress,
      houseFrontPhotoUrl: household.houseFrontPhotoUrl,
      headPhotoUrl: household.headPhotoUrl,
      wivesCount: household.wivesCount,
      childrenCount: household.childrenCount,
      otherDependentsCount: household.otherDependentsCount,
      totalHouseholdMembers: household.totalHouseholdMembers,
      telcoProviders: household.telcoProviders,
      networkType: household.networkType,
      commercialCustomersCount: household.commercialCustomersCount,
      hasPUE: household.hasPUE,
      pueType: household.pueType,
      primaryEnergySource: household.primaryEnergySource,
      interventionStatus: household.interventionStatus,
      capturedAt: household.createdAt,
      agentName: household.agent ? `${household.agent.firstName || ''} ${household.agent.lastName || ''}`.trim() : null,
    };

    const deleteRequest = await prisma.householdDeleteRequest.create({
      data: {
        householdId,
        houseNumber: household.houseNumber,
        headFullName: `${household.headFirstName} ${household.headLastName}`.trim(),
        headPhone: household.headPhone,
        householdSnapshot,
        requestedByUserId: requestingUser.id,
        reason: reason.trim(),
      },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ deleteRequest }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating household delete request:', error);
    return NextResponse.json({ error: error.message || 'Failed to create delete request' }, { status: 500 });
  }
}

// GET /api/households/delete-requests — list all requests with optional filters
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING | APPROVED | REJECTED | all
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const [requests, total] = await Promise.all([
      prisma.householdDeleteRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          household: {
            select: {
              id: true,
              houseNumber: true,
              headFirstName: true,
              headLastName: true,
              headPhone: true,
              state: true,
              lga: true,
              ward: true,
              pollingUnit: true,
            },
          },
        },
      }),
      prisma.householdDeleteRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Error fetching household delete requests:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch delete requests' }, { status: 500 });
  }
}
