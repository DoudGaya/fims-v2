import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { id } = params;

    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id }
        ]
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        nin: true,
        bvn: true,
        gender: true,
        maritalStatus: true,
        dateOfBirth: true,
        employmentStatus: true,
        employmentType: true,
        address: true,
        city: true,
        state: true,
        localGovernment: true,
        ward: true,
        pollingUnit: true,
        assignedState: true,
        assignedLGA: true,
        bankName: true,
        accountName: true,
        accountNumber: true,
        photoUrl: true,
        whatsAppNumber: true,
        alternativePhone: true,
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching agent for update:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { id } = params;
    const body = await request.json();

    const existingAgent = await prisma.agent.findFirst({
      where: {
        OR: [
          { userId: id },
          { id: id }
        ]
      },
      include: { user: true }
    });

    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Whitelist allowed fields to prevent arbitrary data injection
    const allowedFields = [
      'nin', 'firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender',
      'maritalStatus', 'employmentStatus', 'employmentType', 'photoUrl',
      'phone', 'whatsAppNumber', 'alternativePhone', 'address', 'city',
      'state', 'localGovernment', 'ward', 'pollingUnit', 'bankName',
      'accountName', 'accountNumber', 'bvn'
    ];

    const updateData: any = {};
    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key) && body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Special handling for dates
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
    }

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id: existingAgent.id },
      data: updateData,
    });

    // Keep user in sync if identity fields changed
    const userUpdate: any = {};
    if (updateData.firstName) userUpdate.firstName = updateData.firstName;
    if (updateData.lastName) userUpdate.lastName = updateData.lastName;
    if (updateData.firstName || updateData.lastName) {
      userUpdate.displayName = `${updateData.firstName || existingAgent.firstName} ${updateData.lastName || existingAgent.lastName}`.trim();
    }
    if (updateData.phone) userUpdate.phoneNumber = updateData.phone;

    if (Object.keys(userUpdate).length > 0 && existingAgent.userId) {
      await prisma.user.update({
        where: { id: existingAgent.userId },
        data: userUpdate,
      }).catch(err => console.warn('Failed to sync user table in agent update:', err));
    }

    return NextResponse.json({ success: true, agent: updatedAgent });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update agent profile' },
      { status: 500 }
    );
  }
}
