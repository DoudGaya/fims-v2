import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

// POST /api/farms/delete-requests — create a new deletion request
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { farmId, reason } = body;

    if (!farmId || typeof farmId !== 'string') {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    // Check farm exists and get snapshot data
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        farmer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Check for existing pending request for this farm
    const existing = await prisma.farmDeleteRequest.findFirst({
      where: { farmId, status: 'PENDING' },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A pending deletion request already exists for this farm' },
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

    const farmSnapshot = {
      primaryCrop: farm.primaryCrop,
      farmSize: farm.farmSize,
      farmState: farm.farmState,
      farmLocalGovernment: farm.farmLocalGovernment,
      farmWard: farm.farmWard,
      farmPollingUnit: farm.farmPollingUnit,
      farmLatitude: farm.farmLatitude,
      farmLongitude: farm.farmLongitude,
      farmPolygon: farm.farmPolygon,
      farmingSeason: farm.farmingSeason,
      produceCategory: farm.produceCategory,
    };

    const deleteRequest = await prisma.farmDeleteRequest.create({
      data: {
        farmId,
        farmerId: farm.farmerId,
        farmerName: `${farm.farmer.firstName} ${farm.farmer.lastName}`,
        farmSnapshot,
        requestedByUserId: requestingUser.id,
        reason: reason.trim(),
      },
      include: {
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ deleteRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating farm delete request:', error);
    return NextResponse.json({ error: 'Failed to create delete request' }, { status: 500 });
  }
}

// GET /api/farms/delete-requests — list all requests with optional filters
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
      prisma.farmDeleteRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          farm: { select: { id: true, primaryCrop: true, farmSize: true } },
        },
      }),
      prisma.farmDeleteRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching farm delete requests:', error);
    return NextResponse.json({ error: 'Failed to fetch delete requests' }, { status: 500 });
  }
}
