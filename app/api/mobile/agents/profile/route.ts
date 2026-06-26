import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { invalidateByPrefix } from '@/lib/cache';

export const dynamic = 'force-dynamic';

const MOBILE_AGENT_ROLES = ['agent', 'data_correction_agent', 'survey_agent'] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (!MOBILE_AGENT_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Not an agent' }, { status: 403 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching mobile agent profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (!MOBILE_AGENT_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Not an agent' }, { status: 403 });
    }

    const body = await req.json();

    // Check if agent exists
    const existingAgent = await prisma.agent.findUnique({
      where: { userId },
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
      where: { userId },
      data: agentUpdateData,
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

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
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
