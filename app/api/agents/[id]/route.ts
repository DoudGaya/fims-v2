import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { invalidateByPrefix } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

const MOBILE_AGENT_ROLES = ['agent', 'data_correction_agent', 'survey_agent'] as const;

const AGENT_TYPE_ROLE_MAP: Record<string, string> = {
  enrollment: 'agent',
  correction: 'data_correction_agent',
  survey:     'survey_agent',
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

    if (!agent || !MOBILE_AGENT_ROLES.includes(agent.role as any)) {
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

    // Prepare update data - only include fields that are provided
    const userUpdateData: any = {};
    if (body.firstName !== undefined) userUpdateData.firstName = body.firstName;
    if (body.lastName !== undefined) userUpdateData.lastName = body.lastName;
    if (body.firstName && body.lastName) {
      userUpdateData.displayName = `${body.firstName} ${body.lastName}`;
    }
    if (body.phone !== undefined) userUpdateData.phoneNumber = body.phone;
    if (body.isActive !== undefined) {
      userUpdateData.isActive = body.isActive;
    } else if (body.status) {
      userUpdateData.isActive = body.status === 'active' || body.status === 'Enrolled';
    }
    if (body.agentType && AGENT_TYPE_ROLE_MAP[body.agentType]) {
      userUpdateData.role = AGENT_TYPE_ROLE_MAP[body.agentType];
    }

    // Prepare agent update data - only include provided fields
    const agentUpdateData: any = {};
    if (body.firstName !== undefined) agentUpdateData.firstName = body.firstName;
    if (body.lastName !== undefined) agentUpdateData.lastName = body.lastName;
    if (body.middleName !== undefined) agentUpdateData.middleName = body.middleName || null;
    if (body.phone !== undefined && body.phone) {
      // Check if phone is being changed and if it's already taken
      if (body.phone !== existingAgent.phoneNumber) {
        const phoneExists = await prisma.agent.findFirst({
          where: { phone: body.phone, NOT: { userId: id } }
        });
        if (phoneExists) {
          return NextResponse.json({ error: 'Phone number already in use by another agent' }, { status: 409 });
        }
      }
      agentUpdateData.phone = body.phone;
    }
    if (body.nin !== undefined && body.nin) {
      // Check if NIN is being changed and if it's already taken
      if (body.nin !== existingAgent.agent?.nin) {
        const ninExists = await prisma.agent.findFirst({
          where: { nin: body.nin, NOT: { userId: id } }
        });
        if (ninExists) {
          return NextResponse.json({ error: 'NIN already in use by another agent' }, { status: 409 });
        }
      }
      agentUpdateData.nin = body.nin;
    }
    if (body.bvn !== undefined && body.bvn) {
      // Check if BVN is being changed and if it's already taken
      if (body.bvn !== existingAgent.agent?.bvn) {
        const bvnExists = await prisma.agent.findFirst({
          where: { bvn: body.bvn, NOT: { userId: id } }
        });
        if (bvnExists) {
          return NextResponse.json({ error: 'BVN already in use by another agent' }, { status: 409 });
        }
      }
      agentUpdateData.bvn = body.bvn;
    }
    if (body.gender !== undefined) agentUpdateData.gender = body.gender;
    if (body.maritalStatus !== undefined) agentUpdateData.maritalStatus = body.maritalStatus;
    if (body.dateOfBirth !== undefined) {
      agentUpdateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.address !== undefined) agentUpdateData.address = body.address;
    if (body.bankName !== undefined) agentUpdateData.bankName = body.bankName;
    if (body.accountNumber !== undefined) agentUpdateData.accountNumber = body.accountNumber;
    if (body.accountName !== undefined) agentUpdateData.accountName = body.accountName;
    if (body.photoUrl !== undefined) agentUpdateData.photoUrl = body.photoUrl;
    if (body.state !== undefined) agentUpdateData.state = body.state;
    if (body.localGovernment !== undefined || body.lga !== undefined) {
      agentUpdateData.localGovernment = body.localGovernment || body.lga;
    }
    if (body.ward !== undefined) agentUpdateData.ward = body.ward;
    if (body.pollingUnit !== undefined) agentUpdateData.pollingUnit = body.pollingUnit;
    if (body.assignedState !== undefined) agentUpdateData.assignedState = body.assignedState;
    if (body.assignedLGA !== undefined) agentUpdateData.assignedLGA = body.assignedLGA;
    if (body.status !== undefined) agentUpdateData.status = body.status;

    // Update User and Agent profile
    const result = await prisma.$transaction(async (tx) => {
      // Update User
      const user = await tx.user.update({
        where: { id },
        data: userUpdateData
      });

      // Check if agent profile exists
      const agentExists = await tx.agent.findUnique({
        where: { userId: id }
      });

      let agentProfile;
      
      if (agentExists) {
        // Update existing agent profile
        agentProfile = await tx.agent.update({
          where: { userId: id },
          data: agentUpdateData
        });
      } else {
        // Create new agent profile
        agentProfile = await tx.agent.create({
          data: {
            userId: id,
            firstName: body.firstName || existingAgent.firstName || '',
            lastName: body.lastName || existingAgent.lastName || '',
            middleName: body.middleName || null,
            email: existingAgent.email,
            phone: body.phone || existingAgent.phoneNumber || '',
            nin: body.nin || `NIN-${Date.now()}-${id.substring(0, 8)}`,
            bvn: body.bvn || null,
            gender: body.gender || null,
            maritalStatus: body.maritalStatus || null,
            dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
            address: body.address || null,
            bankName: body.bankName || null,
            accountNumber: body.accountNumber || null,
            accountName: body.accountName || null,
            state: body.state || null,
            localGovernment: body.localGovernment || body.lga || null,
            ward: body.ward || null,
            pollingUnit: body.pollingUnit || null,
            assignedState: body.assignedState || null,
            assignedLGA: body.assignedLGA || null,
            status: body.status || (body.isActive ? 'active' : 'inactive'),
          }
        });
      }

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

    await invalidateByPrefix('fims:v1:agents');

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    if (!existingAgent || !MOBILE_AGENT_ROLES.includes(existingAgent.role as any)) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check unique constraints if updating unique fields
    if (body.phone && body.phone !== existingAgent.agent?.phone) {
      const phoneExists = await prisma.agent.findFirst({
        where: { phone: body.phone, NOT: { userId: id } }
      });
      if (phoneExists) {
        return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 });
      }
    }

    if (body.nin && body.nin !== existingAgent.agent?.nin) {
      const ninExists = await prisma.agent.findFirst({
        where: { nin: body.nin, NOT: { userId: id } }
      });
      if (ninExists) {
        return NextResponse.json({ error: 'NIN already in use' }, { status: 409 });
      }
    }

    if (body.bvn && body.bvn !== existingAgent.agent?.bvn) {
      const bvnExists = await prisma.agent.findFirst({
        where: { bvn: body.bvn, NOT: { userId: id } }
      });
      if (bvnExists) {
        return NextResponse.json({ error: 'BVN already in use' }, { status: 409 });
      }
    }

    // Quick update for status or simple fields.
    // Agent model has no isActive — that field lives on User.
    // Build a whitelist of valid Agent fields only.
    const agentPatchData: any = {};
    if (body.status !== undefined)               agentPatchData.status               = body.status;
    if (body.phone !== undefined)                agentPatchData.phone                = body.phone;
    if (body.nin !== undefined)                  agentPatchData.nin                  = body.nin;
    if (body.bvn !== undefined)                  agentPatchData.bvn                  = body.bvn;
    if (body.gender !== undefined)               agentPatchData.gender               = body.gender;
    if (body.maritalStatus !== undefined)        agentPatchData.maritalStatus        = body.maritalStatus;
    if (body.assignedState !== undefined)        agentPatchData.assignedState        = body.assignedState;
    if (body.assignedLGA !== undefined)          agentPatchData.assignedLGA          = body.assignedLGA;
    if (body.address !== undefined)              agentPatchData.address              = body.address;
    if (body.state !== undefined)                agentPatchData.state                = body.state;
    if (body.localGovernment !== undefined)      agentPatchData.localGovernment      = body.localGovernment;
    if (body.performanceRating !== undefined)    agentPatchData.performanceRating    = body.performanceRating;
    if (body.totalFarmersRegistered !== undefined) agentPatchData.totalFarmersRegistered = body.totalFarmersRegistered;

    if (Object.keys(agentPatchData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update Agent profile if it exists
      if (existingAgent.agent) {
        const agentProfile = await tx.agent.update({
          where: { userId: id },
          data: agentPatchData        // safe — no User fields present
        });

        // isActive lives on User, not Agent — update separately
        if (body.status !== undefined) {
          await tx.user.update({
            where: { id },
            data: {
              isActive: body.status === 'active' || body.status === 'Enrolled'
            }
          });
        }

        return agentProfile;
      } else {
        return null;
      }
    });

    if (!result) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 });
    }

    // Send email if status changed
    if (body.status && body.status !== existingAgent.agent?.status) {
      const { sendAgentStatusEmail } = await import('@/lib/emailService');
      await sendAgentStatusEmail(
        existingAgent.email,
        existingAgent.firstName || 'Agent',
        body.status
      );
    }

    await invalidateByPrefix('fims:v1:agents');

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    }, { status: 500 });
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

    await invalidateByPrefix('fims:v1:agents');

    return NextResponse.json({ message: 'Agent deleted successfully' });

  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
