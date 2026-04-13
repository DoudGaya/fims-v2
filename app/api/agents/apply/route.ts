import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/agents/apply
 *
 * Public endpoint — no authentication required.
 * Creates a User (isActive=false) + Agent (status='Applied') so the
 * application immediately appears under the "Applied" filter in the
 * admin agents dashboard for review and approval.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      enrollmentCode?: string;
      firstName?:     string;
      lastName?:      string;
      email?:         string;
      phone?:         string;
      gender?:        string;
      maritalStatus?: string;
      dateOfBirth?:   string;
      state?:         string;
      lga?:           string;
      ward?:          string;
      pollingUnit?:   string;
      city?:          string;
      whatsAppNumber?: string;
      education?:     string;
      courseOfStudy?: string;
      cluster?:       string;
      jobHistory?:    string;
      nin?:           string;
      bvn?:           string;
      message?:       string;
      bankName?:      string;
      bankCode?:      string;
      accountName?:   string;
      accountNumber?: string;
      photoUrl?:      string;
    };

    // Validate required fields
    const required = ['firstName', 'lastName', 'email', 'phone', 'enrollmentCode'] as const;
    for (const field of required) {
      if (!body[field]?.trim()) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }

    const email = body.email!.trim().toLowerCase();
    const phone = body.phone!.trim();

    // ── Duplicate check ───────────────────────────────────────────────────
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phoneNumber: phone }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email or phone number already exists.' },
        { status: 409 },
      );
    }

    // ── NIN uniqueness (only when provided) ───────────────────────────────
    const providedNin = body.nin?.trim();
    if (providedNin) {
      const ninExists = await prisma.agent.findUnique({ where: { nin: providedNin } });
      if (ninExists) {
        return NextResponse.json({ error: 'This NIN is already registered.' }, { status: 409 });
      }
    }

    // ── BVN uniqueness (only when provided) ─────────────────────────────
    const providedBvn = body.bvn?.trim();
    if (providedBvn) {
      const bvnExists = await prisma.agent.findUnique({ where: { bvn: providedBvn } });
      if (bvnExists) {
        return NextResponse.json({ error: 'This BVN is already registered.' }, { status: 409 });
      }
    }

    // Use a placeholder NIN so the @unique constraint is satisfied while the
    // application awaits admin review. Admin replaces it with the real NIN on approval.
    const nin = providedNin ?? `APP-${Date.now()}`;

    // ── Build address from enrollment code, cluster, courseOfStudy, jobHistory, message ───
    const addressParts: string[] = [];
    if (body.enrollmentCode?.trim()) {
      addressParts.push(`Enrollment Code: ${body.enrollmentCode.trim()}`);
    }
    if (body.cluster?.trim()) {
      addressParts.push(`Cluster: ${body.cluster.trim()}`);
    }
    if (body.courseOfStudy?.trim()) {
      addressParts.push(`Course of Study: ${body.courseOfStudy.trim()}`);
    }
    if (body.jobHistory?.trim()) {
      addressParts.push(`Job History:\n${body.jobHistory.trim()}`);
    }
    if (body.message?.trim()) {
      addressParts.push(`Cover Note:\n${body.message.trim()}`);
    }
    const address = addressParts.length > 0 ? addressParts.join('\n\n') : null;

    // ── Create User + Agent in one transaction ────────────────────────────
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName:   body.firstName!.trim(),
          lastName:    body.lastName!.trim(),
          displayName: `${body.firstName!.trim()} ${body.lastName!.trim()}`,
          phoneNumber: phone,
          role:        'agent',
          isActive:    false,   // not active until admin approves
          isVerified:  false,
        },
      });

      await tx.agent.create({
        data: {
          userId:           user.id,
          firstName:        body.firstName!.trim(),
          lastName:         body.lastName!.trim(),
          email,
          phone,
          nin,
          gender:           body.gender?.trim()          || null,
          maritalStatus:    body.maritalStatus?.trim()   || null,
          dateOfBirth:      body.dateOfBirth ? new Date(body.dateOfBirth) : null,
          state:            body.state?.trim()           || null,
          localGovernment:  body.lga?.trim()             || null,
          ward:             body.ward?.trim()            || null,
          pollingUnit:      body.pollingUnit?.trim()     || null,
          city:             body.city?.trim()            || null,
          whatsAppNumber:   body.whatsAppNumber?.trim()  || null,
          assignedState:    body.state?.trim()           || null,
          assignedLGA:      body.lga?.trim()             || null,
          employmentStatus: body.education?.trim()       || null,
          employmentType:   body.courseOfStudy?.trim()   || null,
          bankName:         body.bankName?.trim()        || null,
          accountName:      body.accountName?.trim()     || null,
          accountNumber:    body.accountNumber?.trim()   || null,
          bvn:              providedBvn                  || null,
          photoUrl:         body.photoUrl?.trim()        || null,
          status:           'Applied',
          address,
        },
      });
    });

    return NextResponse.json(
      { success: true, message: 'Application submitted successfully. We will be in touch shortly.' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Agent apply error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 },
    );
  }
}
