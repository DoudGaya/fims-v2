import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { id } = params;
    const body = await request.json();

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
      if (allowedFields.includes(key)) {
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

    const updatedAgent = await prisma.agent.update({
      where: { userId: id },
      data: updateData,
    });

    return NextResponse.json({ success: true, agent: updatedAgent });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent profile' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { id } = params;
    
    const agent = await prisma.agent.findUnique({
      where: { userId: id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nin: true,
        gender: true,
        maritalStatus: true,
        dateOfBirth: true,
        address: true,
        city: true,
        state: true,
        localGovernment: true,
        ward: true,
        pollingUnit: true,
        bankName: true,
        accountName: true,
        accountNumber: true,
        bvn: true,
        photoUrl: true,
        phone: true,
        whatsAppNumber: true,
        alternativePhone: true,
      }
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent profile' },
      { status: 500 }
    );
  }
}
