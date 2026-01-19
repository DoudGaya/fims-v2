import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Fetch User with Agent profile
    const agent = await prisma.user.findUnique({
      where: { id },
      include: {
        agent: true,
        _count: {
          select: {
            farmers: true
          }
        }
      }
    });

    if (!agent || agent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Check if agent exists
    const existingAgent = await prisma.user.findUnique({
      where: { id },
      include: { agent: true }
    });

    if (!existingAgent || existingAgent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Determine current status
    const currentStatus = existingAgent.agent?.status || 'unknown';
    const newStatus = body.status;
    const statusChanged = newStatus && newStatus !== currentStatus;

    // Update User and Agent profile
    const result = await prisma.$transaction(async (tx) => {
      // Update User
      const user = await tx.user.update({
        where: { id },
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          displayName: body.firstName && body.lastName ? `${body.firstName} ${body.lastName}` : undefined,
          phoneNumber: body.phone,
          isActive: body.isActive !== undefined ? body.isActive : undefined,
        }
      });

      // Update Agent Profile if it exists, or create it
      const agentProfile = await tx.agent.upsert({
        where: { userId: id },
        create: {
          userId: id,
          firstName: body.firstName || existingAgent.firstName || '',
          lastName: body.lastName || existingAgent.lastName || '',
          middleName: body.middleName,
          email: existingAgent.email,
          phone: body.phone || existingAgent.phoneNumber || '',
          nin: body.nin || `NIN-${Date.now()}`,
          bvn: body.bvn,
          gender: body.gender,
          maritalStatus: body.maritalStatus,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
          address: body.address,
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          accountName: body.accountName,
          state: body.state,
          localGovernment: body.localGovernment || body.lga,
          ward: body.ward,
          pollingUnit: body.pollingUnit,
          assignedState: body.assignedState,
          assignedLGA: body.assignedLGA,
          status: body.status || (body.isActive ? 'active' : 'inactive'),
        },
        update: {
          firstName: body.firstName,
          lastName: body.lastName,
          middleName: body.middleName,
          phone: body.phone,
          nin: body.nin,
          bvn: body.bvn,
          gender: body.gender,
          maritalStatus: body.maritalStatus,
          dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
          address: body.address,
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          accountName: body.accountName,
          state: body.state,
          localGovernment: body.localGovernment || body.lga,
          ward: body.ward,
          pollingUnit: body.pollingUnit,
          assignedState: body.assignedState,
          assignedLGA: body.assignedLGA,
          status: body.status, // Update recruitment status
        }
      });

      return { user, agentProfile };
    });

    // Send Email Notification if status changed
    if (statusChanged) {
      // Dynamic import to avoid circular dep issues if any, though standard import is fine
      const { sendAgentStatusEmail } = await import('@/lib/emailService');
      await sendAgentStatusEmail(
        existingAgent.email,
        existingAgent.firstName || 'Agent',
        newStatus
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];
    if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_DELETE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    // Check if agent exists
    const existingAgent = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { farmers: true }
        }
      }
    });

    if (!existingAgent || existingAgent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Prevent deletion if agent has registered farmers
    if (existingAgent._count.farmers > 0) {
      return NextResponse.json({
        error: `Cannot delete agent. They have registered ${existingAgent._count.farmers} farmers. Deactivate the account instead.`
      }, { status: 400 });
    }

    // Delete User (Cascade should handle Agent profile if configured, but let's be safe)
    // Schema says: user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    // So deleting User should delete Agent profile.

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Agent deleted successfully' });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
