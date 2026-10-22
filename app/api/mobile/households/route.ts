import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getMobileUser, requireRole } from '@/lib/mobileAuth';
import { formatPollingUnit } from '@/lib/textUtils';

// Helper to synthesize traceable house number
function generateSyntheticHouseNumber(state: string, lga: string, ward: string, pu: string, seq: number): string {
  const clean = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'LOC';
  const stateCode = clean(state);
  const lgaCode = clean(lga);
  const wardCode = clean(ward);
  const puCode = clean(pu);
  const seqStr = String(seq).padStart(3, '0');
  return `NG-${stateCode}-${lgaCode}-${wardCode}-${puCode}-H${seqStr}`;
}

const householdSchema = z.object({
  id: z.string().optional(),
  offlineId: z.string().optional().nullable(),
  houseNumber: z.string().optional().nullable(),

  // Location
  state: z.string().min(1, 'State is required'),
  lga: z.string().min(1, 'LGA is required'),
  ward: z.string().min(1, 'Ward is required'),
  pollingUnit: z.string().min(1, 'Polling Unit is required'),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  accuracy: z.number().optional().nullable(),
  houseFrontPhotoUrl: z.string().optional().nullable(),

  // Head details
  headFirstName: z.string().min(1, 'Head First Name is required'),
  headMiddleName: z.string().optional().nullable(),
  headLastName: z.string().min(1, 'Head Last Name is required'),
  headPhone: z.string().min(8, 'Head Phone Number is required'),
  headPhoneVerified: z.boolean().optional().default(false),
  headGender: z.enum(['MALE', 'FEMALE', 'OTHER']).default('MALE'),
  headDateOfBirth: z.string().optional().nullable(),
  headMaritalStatus: z.string().optional().nullable(),
  headNin: z.string().optional().nullable(),
  headPhotoUrl: z.string().optional().nullable(),
  headNinVerified: z.boolean().optional().default(false),
  headEmploymentStatus: z.string().optional().nullable(),
  headEducationLevel: z.string().optional().nullable(),
  headEmail: z.string().optional().nullable(),
  headStateOfOrigin: z.string().optional().nullable(),
  headLgaOfOrigin: z.string().optional().nullable(),
  headResidenceAddress: z.string().optional().nullable(),
  gpsAddress: z.string().optional().nullable(),
  locationCapturedAt: z.string().optional().nullable(),

  // Dependents
  wivesCount: z.number().int().min(0).default(0),
  childrenCount: z.number().int().min(0).default(0),
  otherDependentsCount: z.number().int().min(0).default(0),
  totalHouseholdMembers: z.number().int().min(1).default(1),
  dependentsNotes: z.string().optional().nullable(),

  // Telco & Connectivity
  telcoProviders: z.array(z.string()).default([]),
  networkType: z.string().optional().nullable(),

  // Economic Activity
  commercialCustomersCount: z.number().int().min(0).default(0),

  // Productive Use of Power (PUE)
  hasPUE: z.boolean().default(false),
  pueType: z.string().optional().nullable(),
  pueEquipment: z.array(z.string()).default([]),
  pueDailyHours: z.number().optional().nullable(),
  primaryEnergySource: z.string().optional().nullable(),

  // Intervention
  interventionStatus: z.string().default('Captured'),
  interventionType: z.string().optional().nullable(),
  interventionNotes: z.string().optional().nullable(),
});

/**
 * GET /api/mobile/households
 * List households for the authenticated agent
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await getMobileUser(req);
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    const roleError = requireRole(user, 'household_agent', 'admin', 'manager');
    if (roleError) return roleError;

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
    const skip = (page - 1) * limit;
    const search = sp.get('search') || sp.get('query') || '';

    const where: Prisma.HouseholdWhereInput = {};

    // Agent only sees their captured households unless admin/manager
    if (user.role === 'household_agent' || user.role === 'agent') {
      where.agentId = user.id;
    }

    if (search) {
      where.OR = [
        { houseNumber: { contains: search, mode: 'insensitive' } },
        { headFirstName: { contains: search, mode: 'insensitive' } },
        { headLastName: { contains: search, mode: 'insensitive' } },
        { headPhone: { contains: search, mode: 'insensitive' } },
        { headNin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [households, total] = await Promise.all([
      prisma.household.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.household.count({ where }),
    ]);

    return NextResponse.json({
      households,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching mobile households:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/mobile/households
 * Batch or single ingestion of household capture records from mobile
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await getMobileUser(req);
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    const roleError = requireRole(user, 'household_agent', 'admin', 'manager');
    if (roleError) return roleError;

    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No household records provided' }, { status: 400 });
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Count existing households in the DB to calculate sequence baseline if needed
    const currentCount = await prisma.household.count();

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const parsed = householdSchema.safeParse(raw);

      if (!parsed.success) {
        errors.push({
          index: i,
          offlineId: raw.offlineId || null,
          error: 'Validation failed',
          details: parsed.error.format(),
        });
        continue;
      }

      const data = parsed.data;

      // Ensure traceable houseNumber
      let houseNumber = data.houseNumber?.trim();
      if (!houseNumber) {
        const seq = currentCount + results.length + 1;
        houseNumber = generateSyntheticHouseNumber(data.state, data.lga, data.ward, data.pollingUnit, seq);
      }

      try {
        // If an existing record with this offlineId exists for this agent, update it
        let existing = null;
        if (data.offlineId) {
          existing = await prisma.household.findFirst({
            where: { offlineId: data.offlineId, agentId: user.id },
          });
        }

        if (!existing) {
          // A client-generated number may collide with another household's. Never
          // overwrite that record; assign the next free sequence for this location.
          let attempt = 0;
          while (await prisma.household.findUnique({ where: { houseNumber } })) {
            attempt += 1;
            houseNumber = generateSyntheticHouseNumber(
              data.state, data.lga, data.ward, data.pollingUnit,
              currentCount + results.length + attempt + 1,
            );
            if (attempt > 50) throw new Error('Could not allocate a unique house number');
          }
        }

        const payload = {
          houseNumber,
          state: data.state,
          lga: data.lga,
          ward: data.ward,
          pollingUnit: formatPollingUnit(data.pollingUnit),
          address: data.address || null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          accuracy: data.accuracy ?? null,
          houseFrontPhotoUrl: data.houseFrontPhotoUrl || null,
          headFirstName: data.headFirstName,
          headMiddleName: data.headMiddleName || null,
          headLastName: data.headLastName,
          headPhone: data.headPhone,
          headPhoneVerified: data.headPhoneVerified ?? false,
          headGender: data.headGender,
          headDateOfBirth: data.headDateOfBirth ? new Date(data.headDateOfBirth) : null,
          headMaritalStatus: data.headMaritalStatus || null,
          headNin: data.headNin || null,
          headPhotoUrl: data.headPhotoUrl || null,
          headNinVerified: data.headNinVerified ?? false,
          headEmploymentStatus: data.headEmploymentStatus || null,
          headEducationLevel: data.headEducationLevel || null,
          headEmail: data.headEmail || null,
          headStateOfOrigin: data.headStateOfOrigin || null,
          headLgaOfOrigin: data.headLgaOfOrigin || null,
          headResidenceAddress: data.headResidenceAddress || null,
          gpsAddress: data.gpsAddress || null,
          locationCapturedAt: data.locationCapturedAt ? new Date(data.locationCapturedAt) : null,
          wivesCount: data.wivesCount,
          childrenCount: data.childrenCount,
          otherDependentsCount: data.otherDependentsCount,
          totalHouseholdMembers: data.totalHouseholdMembers || (1 + data.wivesCount + data.childrenCount + data.otherDependentsCount),
          dependentsNotes: data.dependentsNotes || null,
          telcoProviders: data.telcoProviders,
          networkType: data.networkType || null,
          commercialCustomersCount: data.commercialCustomersCount,
          hasPUE: data.hasPUE,
          pueType: data.pueType || null,
          pueEquipment: data.pueEquipment,
          pueDailyHours: data.pueDailyHours ?? null,
          primaryEnergySource: data.primaryEnergySource || null,
          interventionStatus: data.interventionStatus || 'Captured',
          interventionType: data.interventionType || null,
          interventionNotes: data.interventionNotes || null,
          agentId: user.id,
          offlineId: data.offlineId || null,
          syncedAt: new Date(),
        };

        let record;
        if (existing) {
          record = await prisma.household.update({
            where: { id: existing.id },
            data: payload,
          });
        } else {
          record = await prisma.household.create({
            data: payload,
          });
        }

        results.push(record);
      } catch (dbErr: any) {
        console.error(`Error saving household index ${i}:`, dbErr);
        errors.push({
          index: i,
          offlineId: data.offlineId || null,
          error: dbErr.message || 'Database error',
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      savedCount: results.length,
      failedCount: errors.length,
      households: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error in POST /api/mobile/households:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
