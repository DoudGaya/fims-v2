import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { redactFarmer, buildFieldVisibilityMeta } from '@/lib/sensitive-fields';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/farmers/:id
 *
 * Fetch a single farmer by ID, including their farms and cluster.
 * Farm polygon coordinates are excluded from the public API.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKey(req, 'farmers:read');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { allowSensitiveFields } = auth.apiKey;

  const farmer = await prisma.farmer.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      gender: true,
      dateOfBirth: true,
      state: true,
      lga: true,
      ward: true,
      pollingUnit: true,
      address: true,
      maritalStatus: true,
      employmentStatus: true,
      status: true,
      registrationDate: true,
      createdAt: true,
      // identity
      nin: true,
      // financial
      bvn: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      // contact
      phone: true,
      email: true,
      whatsAppNumber: true,
      // relations
      cluster: { select: { id: true, title: true, description: true } },
      farms: {
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
          farmingExperience: true,
          farmLatitude: true,
          farmLongitude: true,
          soilType: true,
          soilPH: true,
          soilFertility: true,
          farmArea: true,
          year: true,
          yieldSeason: true,
          crop: true,
          quantity: true,
          cropVariety: true,
          createdAt: true,
          // Polygon excluded from public API — too granular / large
        },
      },
      referees: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          relationship: true,
        },
      },
    },
  });

  if (!farmer) {
    return NextResponse.json({ error: 'Not Found', message: 'Farmer not found.' }, { status: 404 });
  }

  return NextResponse.json({
    data: redactFarmer(farmer as any, allowSensitiveFields),
    meta: buildFieldVisibilityMeta(allowSensitiveFields),
  });
}
