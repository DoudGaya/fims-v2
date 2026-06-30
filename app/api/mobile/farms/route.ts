import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { z } from 'zod';

const parseFloatOrUndefined = (val: any) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? undefined : parsed;
};

const parseIntOrUndefined = (val: any) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? undefined : parsed;
};

const farmCreateSchema = z.object({
  farmerId: z.string().min(1, 'farmerId is required'),
  farmSize: z.any().transform(parseFloatOrUndefined),
  primaryCrop: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  secondaryCrop: z.union([z.string(), z.array(z.string())])
    .optional()
    .nullable()
    .transform((val) => {
      if (typeof val === 'string') return val.split(',').map((s) => s.trim()).filter(Boolean);
      return val ?? [];
    }),
  produceCategory: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmOwnership: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmState: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmLocalGovernment: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmingSeason: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmWard: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmPollingUnit: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmingExperience: z.any().transform(parseIntOrUndefined),
  farmLatitude: z.any().transform(parseFloatOrUndefined),
  farmLongitude: z.any().transform(parseFloatOrUndefined),
  farmPolygon: z.any().optional().nullable(),
  farmCoordinates: z.any().optional().nullable(),
  soilType: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  soilPH: z.any().transform(parseFloatOrUndefined),
  soilFertility: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  farmArea: z.any().transform(parseFloatOrUndefined),
  farmElevation: z.any().transform(parseFloatOrUndefined),
  year: z.any().transform(parseFloatOrUndefined),
  yieldSeason: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  crop: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  quantity: z.any().transform(parseFloatOrUndefined),
  coordinateSystem: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  landforms: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
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
