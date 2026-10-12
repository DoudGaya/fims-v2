import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Generates an IDEAS-TVET admission letter for a trainee in the IDEAS 2 cluster.
// Public endpoint — no auth required. Verifies that the person is in an IDEAS cluster.
export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json(); // NIN or phone number

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'Please provide your NIN or phone number.' }, { status: 400 });
    }

    const clean = identifier.replace(/[\s\-()]/g, '').replace(/^\+234/, '0');

    // Look up farmer by NIN or phone, must be in an IDEAS cluster
    const farmer = await prisma.farmer.findFirst({
      where: {
        OR: [
          { nin: clean },
          { phone: clean },
        ],
        cluster: {
          title: { startsWith: 'IDEAS' },
        },
      },
      include: {
        cluster: true,
      },
    });

    if (!farmer) {
      return NextResponse.json(
        { error: 'No trainee found with that NIN or phone in an IDEAS programme cluster. Please check your details and try again.' },
        { status: 404 }
      );
    }

    const maskTrailing = (val: string | null | undefined, visibleCount = 4) => {
      if (!val) return val;
      const trimmed = val.trim();
      if (trimmed.length <= visibleCount) return trimmed;
      return '*'.repeat(trimmed.length - visibleCount) + trimmed.slice(-visibleCount);
    };

    // Generate the admission letter data with sensitive financial fields masked
    const letterData = {
      id: farmer.id,
      firstName:     farmer.firstName,
      lastName:      farmer.lastName,
      nin:           farmer.nin,
      bvn:           maskTrailing(farmer.bvn, 4),
      phone:         farmer.phone,
      email:         farmer.email,
      gender:        farmer.gender,
      dateOfBirth:   farmer.dateOfBirth,
      state:         farmer.state,
      lga:           farmer.lga,
      bankName:      farmer.bankName,
      accountNumber: maskTrailing(farmer.accountNumber, 4),
      accountName:   farmer.accountName,
      cluster:       farmer.cluster?.title,
      enrolledAt:    farmer.createdAt,
    };

    return NextResponse.json({ success: true, data: letterData });
  } catch (error) {
    console.error('[ideas2/letter] Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
