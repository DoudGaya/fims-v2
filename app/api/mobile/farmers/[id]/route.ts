import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { farmerSchema } from '@/lib/validation';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/mobile/farmers/[id]
 * Fetch a single farmer by ID.
 * Allowed roles: agent, data_correction_agent, survey_agent, admin
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'survey_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  const farmer = await prisma.farmer.findUnique({
    where: { id },
    include: {
      cluster:  true,
      farms:    true,
      referees: true,
    },
  });

  if (!farmer) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  if (user.role === 'agent' && farmer.agentId !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return NextResponse.json(farmer);
}

/**
 * PUT /api/mobile/farmers/[id]
 * Update a farmer record from the mobile app.
 * Allowed roles: agent, data_correction_agent, admin
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'data_correction_agent', 'admin');
  if (roleError) return roleError;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = farmerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const existing = await prisma.farmer.findUnique({
    where: { id },
    select: {
      id: true,
      agentId: true,
      state: true,
      lga: true,
      ward: true,
      pollingUnit: true
    }
  });
  if (!existing) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  if (user.role === 'agent' && existing.agentId !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const {
    farmSize,
    primaryCrop,
    secondaryCrop,
    farmingExperience,
    farmLatitude,
    farmLongitude,
    farmPolygon,
    referees,
    ...farmerData
  } = parsed.data;

  // Check if farmer has an existing farm record
  const existingFarm = await prisma.farm.findFirst({
    where: { farmerId: id }
  });

  const farmFields: any = {};
  if (farmSize !== undefined) farmFields.farmSize = farmSize;
  if (primaryCrop !== undefined) farmFields.primaryCrop = primaryCrop;
  if (secondaryCrop !== undefined) {
    farmFields.secondaryCrop = Array.isArray(secondaryCrop)
      ? secondaryCrop
      : secondaryCrop.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  if (farmingExperience !== undefined) farmFields.farmingExperience = farmingExperience;
  if (farmLatitude !== undefined) farmFields.farmLatitude = farmLatitude;
  if (farmLongitude !== undefined) farmFields.farmLongitude = farmLongitude;
  if (farmPolygon !== undefined) farmFields.farmPolygon = farmPolygon;

  const hasFarmUpdates = Object.keys(farmFields).length > 0;

  if (hasFarmUpdates) {
    if (existingFarm) {
      await prisma.farm.update({
        where: { id: existingFarm.id },
        data: farmFields,
      });
    } else {
      await prisma.farm.create({
        data: {
          ...farmFields,
          secondaryCrop: farmFields.secondaryCrop || [],
          farmerId: id,
          farmState: farmerData.state || existing.state,
          farmLocalGovernment: farmerData.lga || existing.lga,
          farmWard: farmerData.ward || existing.ward,
          farmPollingUnit: farmerData.pollingUnit || existing.pollingUnit,
        }
      });
    }
  }

  const updated = await prisma.farmer.update({
    where: { id },
    data: {
      ...(farmerData as import('@prisma/client').Prisma.FarmerUncheckedUpdateInput),
      ...(referees ? {
        referees: {
          deleteMany: {},
          create: referees
        }
      } : {})
    },
  });

  return NextResponse.json(updated);
}
