import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { z } from 'zod';

const farmCreateSchema = z.object({
  farmerId: z.string().min(1, 'farmerId is required'),
  farmSize: z.number().optional().nullable(),
  primaryCrop: z.string().optional(),
  secondaryCrop: z.union([z.string(), z.array(z.string())])
    .optional()
    .nullable()
    .transform((val) => {
      if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
      return val ?? [];
    }),
  produceCategory: z.string().optional(),
  farmOwnership: z.string().optional(),
  farmState: z.string().optional(),
  farmLocalGovernment: z.string().optional(),
  farmingSeason: z.string().optional(),
  farmWard: z.string().optional(),
  farmPollingUnit: z.string().optional(),
  farmingExperience: z.number().int().optional().nullable(),
  farmLatitude: z.number().optional().nullable(),
  farmLongitude: z.number().optional().nullable(),
  farmPolygon: z.any().optional().nullable(),
  farmCoordinates: z.any().optional().nullable(),
  soilType: z.string().optional(),
  soilPH: z.number().optional().nullable(),
  soilFertility: z.string().optional(),
  farmArea: z.number().optional().nullable(),
  farmElevation: z.number().optional().nullable(),
});

/**
 * POST /api/mobile/farms
 * Create a new farm record. Allowed roles: agent, admin
 */
export async function POST(req: NextRequest) {
  const authResult = await getMobileUser(req);
  if ('error' in authResult) return authResult.error;
  const { user } = authResult;

  const roleError = requireRole(user, 'agent', 'admin');
  if (roleError) return roleError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = farmCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { farmerId, ...farmData } = parsed.data;

  // Verify farmer exists
  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId }, select: { id: true } });
  if (!farmer) {
    return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
  }

  const farm = await prisma.farm.create({
    data: { ...farmData, farmerId },
  });

  return NextResponse.json(farm, { status: 201 });
}
