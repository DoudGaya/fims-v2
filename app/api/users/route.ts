import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { auth as firebaseAuth } from '@/lib/firebase-admin';

const ACCOUNT_TYPE_ROLE: Record<string, string> = {
  enrollment_agent:  'agent',
  correction_agent:  'data_correction_agent',
  survey_agent:      'survey_agent',
};

function roleFilter(role: string) {
  return {
    OR: [
      { role },
      {
        userRoles: {
          some: {
            role: { name: role },
          },
        },
      },
    ],
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check read permission
    if (!(await hasPermission(session.user.id, PERMISSIONS.USERS_READ))) {
      return NextResponse.json({ error: 'Insufficient permissions to view users' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (role) {
      where.AND = [...(where.AND ?? []), roleFilter(role)];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  permissions: true,
                  isSystem: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where }),
    ]);

    // Transform users to include computed role information
    const transformedUsers = users.map(user => ({
      ...user,
      name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      roles: user.userRoles.length > 0
        ? user.userRoles.map(ur => ur.role)
        : [{ id: user.role, name: user.role, description: null, permissions: [], isSystem: false }],
      permissions: user.userRoles.flatMap(ur => (ur.role.permissions as string[]) || [])
    }));

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check create permission
    if (!(await hasPermission(session.user.id, PERMISSIONS.USERS_CREATE))) {
      return NextResponse.json({ error: 'Insufficient permissions to create users' }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      roleId,
      isActive = true,
      password,
      accountType = 'admin', // 'admin' | 'enrollment_agent' | 'correction_agent' | 'survey_agent'
      phone,
    } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isAgentType = accountType !== 'admin';
    if (isAgentType && !phone) {
      return NextResponse.json({ error: 'Phone number is required for agent accounts' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const simpleRole = isAgentType ? ACCOUNT_TYPE_ROLE[accountType] ?? 'agent' : undefined;
    const assignedRole = isAgentType
      ? await prisma.roles.findUnique({ where: { name: simpleRole } })
      : roleId
        ? await prisma.roles.findUnique({ where: { id: roleId } })
        : null;

    if (isAgentType && !assignedRole) {
      return NextResponse.json(
        { error: `Required role "${simpleRole}" is not configured` },
        { status: 400 }
      );
    }

    if (isAgentType) {
      // --- Agent accounts: create Firebase user + user record + agent profile ---
      let firebaseUser;
      try {
        try {
          firebaseUser = await firebaseAuth.getUserByEmail(email);
          if (firebaseUser) {
            return NextResponse.json({ error: 'Email already exists in Firebase' }, { status: 409 });
          }
        } catch (err: any) {
          if (err.code !== 'auth/user-not-found') throw err;
        }

        firebaseUser = await firebaseAuth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
          phoneNumber: phone ? phone.replace(/\s+/g, '') : undefined,
          emailVerified: true,
          disabled: false,
        });
      } catch (firebaseError: any) {
        console.error('Error creating Firebase user:', firebaseError);
        return NextResponse.json({ error: 'Failed to create Firebase user', details: firebaseError.message }, { status: 500 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            id: firebaseUser.uid,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`,
            phoneNumber: phone,
            role: simpleRole,
            isActive,
            isVerified: true,
            userRoles: assignedRole
              ? { create: { roleId: assignedRole.id } }
              : undefined,
          },
        });

        await tx.agent.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            email,
            phone,
            nin: `NIN-${Date.now()}`,
            state: null,
            localGovernment: null,
            assignedState: null,
            assignedLGA: null,
            status: 'active',
            createdByUserId: (session.user as any).id,
          },
        });

        return user;
      });

      return NextResponse.json(result, { status: 201 });
    }

    // --- Admin / web users: original flow ---
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isActive,
        displayName: `${firstName} ${lastName}`,
        role: assignedRole?.name ?? 'admin',
        userRoles: roleId ? { create: { roleId } } : undefined,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// ─── PATCH /api/users — batch activate / deactivate / delete ─────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as { ids?: string[]; action?: string };
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    if (!['activate', 'deactivate', 'delete'].includes(action ?? '')) {
      return NextResponse.json({ error: 'action must be activate, deactivate, or delete' }, { status: 400 });
    }

    // Prevent acting on own account
    const filteredIds = ids.filter((id) => id !== session.user!.id);

    if (action === 'delete') {
      if (!(await hasPermission(session.user.id, PERMISSIONS.USERS_DELETE))) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      await prisma.user.deleteMany({ where: { id: { in: filteredIds } } });
      return NextResponse.json({ success: true, affected: filteredIds.length });
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.USERS_UPDATE))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const isActive = action === 'activate';
    await prisma.user.updateMany({ where: { id: { in: filteredIds } }, data: { isActive } });
    return NextResponse.json({ success: true, affected: filteredIds.length });

  } catch (error) {
    console.error('Error in batch user action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
