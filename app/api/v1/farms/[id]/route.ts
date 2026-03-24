import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { redactFarmer, buildFieldVisibilityMeta } from '@/lib/sensitive-fields';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/farms/:id
 *
 * Fetch a single farm by ID, including basic farmer info.
 * Farm polygon boundary coordinates are excluded. Farmer sensitive fields follow token settings.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKey(req, 'farms:read');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { allowSensitiveFields } = auth.apiKey;

  const farm = await prisma.farm.findUnique({
    where: { id },
    select: {
      id: true,
      farmSize: true,
      primaryCrop: true,
      secondaryCrop: true,
      produceCategory: true,
      farmOwnership: true,
      farmState: true,
      farmLocalGovernment: true,
      farmingSeason: true,
      farmWard: true,
      farmPollingUnit: true,
      farmingExperience: true,
      farmLatitude: true,
      farmLongitude: true,
      soilType: true,
      soilPH: true,
      soilFertility: true,
      farmArea: true,
      farmElevation: true,
      coordinateSystem: true,
      year: true,
      yieldSeason: true,
      crop: true,
      quantity: true,
      cropVariety: true,
      landforms: true,
      createdAt: true,
      updatedAt: true,
      farmer: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          gender: true,
          state: true,
          lga: true,
          ward: true,
          status: true,
          // sensitive fields
          nin: true,
          bvn: true,
          bankName: true,
          accountNumber: true,
          accountName: true,
          phone: true,
          email: true,
          whatsAppNumber: true,
        },
      },
    },
  });

  if (!farm) {
    return NextResponse.json({ error: 'Not Found', message: 'Farm not found.' }, { status: 404 });
  }

  const result = {
    ...farm,
    farmer: farm.farmer ? redactFarmer(farm.farmer as any, allowSensitiveFields) : null,
  };

  return NextResponse.json({
    data: result,
    meta: buildFieldVisibilityMeta(allowSensitiveFields),
  });
}
