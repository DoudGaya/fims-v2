import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { invalidateByPrefix } from '@/lib/cache';
import { getMobileUser } from '@/lib/mobileAuth';

export const dynamic = 'force-dynamic';

const MOBILE_AGENT_ROLES = [
  'agent',
  'data_correction_agent',
  'survey_agent',
  'agri_business_agent',
  'admin'
] as const;

async function resolveUser(req: NextRequest): Promise<{ userId: string; role: string; email?: string } | null> {
  // Try mobile Firebase Bearer auth first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const mobileAuth = await getMobileUser(req);
    if (!('error' in mobileAuth)) {
      return {
        userId: mobileAuth.user.id,
        role: mobileAuth.user.role,
        email: mobileAuth.user.email,
      };
    }
  }

  // Fallback to NextAuth web session
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      userId: (session.user as any).id,
      role: (session.user as any).role,
      email: session.user.email || undefined,
    };
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role, email } = user;

    if (!MOBILE_AGENT_ROLES.includes(role as any)) {
      return NextResponse.json({ error: 'Not an agent' }, { status: 403 });
    }

    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { userId },
          ...(email ? [{ email }] : [])
        ]
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });
    }

    // Ensure userId is linked if matched by email
    if (agent.userId !== userId) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { userId },
      });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching mobile agent profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role, email } = user;

    if (!MOBILE_AGENT_ROLES.includes(role as any)) {
      return NextResponse.json({ error: 'Not an agent' }, { status: 403 });
    }

    const body = await req.json();

    // Check if agent exists
    const existingAgent = await prisma.agent.findFirst({
      where: {
        OR: [
          { userId },
          ...(email ? [{ email }] : [])
        ]
      },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });
    }

    // Prepare agent update data - strictly whitelist fields
    const agentUpdateData: any = {};
    if (body.firstName !== undefined) agentUpdateData.firstName = body.firstName;
    if (body.lastName !== undefined) agentUpdateData.lastName = body.lastName;
    if (body.middleName !== undefined) agentUpdateData.middleName = body.middleName || null;
    if (body.phone !== undefined && body.phone) {
      // Check if phone is being changed and if it's already taken
      if (body.phone !== existingAgent.phone) {
        const phoneExists = await prisma.agent.findFirst({
          where: { phone: body.phone, NOT: { userId } },
        });
        if (phoneExists) {
          return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
        }
      }
      agentUpdateData.phone = body.phone;
    }
    if (body.nin !== undefined && body.nin) {
      if (body.nin !== existingAgent.nin) {
        const ninExists = await prisma.agent.findFirst({
          where: { nin: body.nin, NOT: { userId } },
        });
        if (ninExists) {
          return NextResponse.json({ error: 'NIN already in use' }, { status: 409 });
        }
      }
      agentUpdateData.nin = body.nin;
    }
    if (body.bvn !== undefined && body.bvn) {
      if (body.bvn !== existingAgent.bvn) {
        const bvnExists = await prisma.agent.findFirst({
          where: { bvn: body.bvn, NOT: { userId } },
        });
        if (bvnExists) {
          return NextResponse.json({ error: 'BVN already in use' }, { status: 409 });
        }
      }
      agentUpdateData.bvn = body.bvn;
    }
    if (body.whatsAppNumber !== undefined) agentUpdateData.whatsAppNumber = body.whatsAppNumber;
    if (body.alternativePhone !== undefined) agentUpdateData.alternativePhone = body.alternativePhone;
    if (body.gender !== undefined) agentUpdateData.gender = body.gender;
    if (body.maritalStatus !== undefined) agentUpdateData.maritalStatus = body.maritalStatus;
    if (body.dateOfBirth !== undefined) {
      agentUpdateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.address !== undefined) agentUpdateData.address = body.address;
    if (body.city !== undefined) agentUpdateData.city = body.city;
    if (body.state !== undefined) agentUpdateData.state = body.state;
    if (body.localGovernment !== undefined) agentUpdateData.localGovernment = body.localGovernment;
    if (body.ward !== undefined) agentUpdateData.ward = body.ward;
    if (body.pollingUnit !== undefined) agentUpdateData.pollingUnit = body.pollingUnit;
    if (body.bankName !== undefined) agentUpdateData.bankName = body.bankName;
    if (body.accountNumber !== undefined) agentUpdateData.accountNumber = body.accountNumber;
    if (body.accountName !== undefined) agentUpdateData.accountName = body.accountName;
    if (body.photoUrl !== undefined) agentUpdateData.photoUrl = body.photoUrl;

    if (Object.keys(agentUpdateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: existingAgent.id },
      data: {
        ...agentUpdateData,
        userId: existingAgent.userId || userId,
      },
    });

    // Also sync User model if name or phone changed
    const userUpdateData: any = {};
    if (agentUpdateData.firstName || agentUpdateData.lastName) {
      userUpdateData.firstName = agentUpdateData.firstName || existingAgent.firstName;
      userUpdateData.lastName = agentUpdateData.lastName || existingAgent.lastName;
      userUpdateData.displayName = `${userUpdateData.firstName} ${userUpdateData.lastName}`.trim();
    }
    if (agentUpdateData.phone) {
      userUpdateData.phoneNumber = agentUpdateData.phone;
    }

    const targetUserId = existingAgent.userId || userId;
    if (Object.keys(userUpdateData).length > 0 && targetUserId) {
      try {
        await prisma.user.update({
          where: { id: targetUserId },
          data: userUpdateData,
        });
      } catch (userSyncErr) {
        console.warn('Could not sync User model record during agent profile update:', userSyncErr);
      }
    }

    await invalidateByPrefix('fims:v1:agents');

    return NextResponse.json(updatedAgent);
  } catch (error: any) {
    console.error('Error updating mobile agent profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
