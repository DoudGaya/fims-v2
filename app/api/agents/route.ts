import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
export const dynamic = "force-dynamic";
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { Prisma } from '@prisma/client';
import { auth as firebaseAuth } from '@/lib/firebase-admin';
import ProductionLogger from '@/lib/productionLogger';
import bcrypt from 'bcryptjs';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];

    if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    // In the legacy code, agents are Users with role='agent'.
    // However, there is also an 'Agent' model in Prisma schema which seems to be a profile for the user.
    // The legacy API queries `prisma.user.findMany({ where: { role: 'agent' } })`.
    // Let's stick to querying Users with role='agent' as per legacy implementation, 
    // but we should also consider if we need to join with the Agent model if it exists.
    // Looking at the schema, User has `agent Agent?`.

    const where: Prisma.UserWhereInput = {
      role: 'agent'
    };

    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
      where.agent = { status: 'active' }; // Ensure they are fully active
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (['Applied', 'CallForInterview', 'Accepted', 'Rejected', 'Enrolled'].includes(status)) {
      where.agent = { status: status };
    }

    // Execute query
    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              farmers: true
            }
          },
          agent: {
            select: {
              state: true,
              localGovernment: true,
              assignedState: true,
              assignedLGA: true,
              status: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userPermissions = (session.user as any).permissions as string[];

    if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_CREATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();

    // Basic validation
    if (!body.email || !body.password || !body.firstName || !body.lastName || !body.phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.email },
          { phoneNumber: body.phone }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email or phone already exists' }, { status: 409 });
    }

    // Create Firebase user first
    let firebaseUser;
    try {
      // Check if user exists in Firebase
      try {
        firebaseUser = await firebaseAuth.getUserByEmail(body.email);
        if (firebaseUser) {
          return NextResponse.json({ error: 'User with this email already exists in Firebase' }, { status: 409 });
        }
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Create new Firebase user
      firebaseUser = await firebaseAuth.createUser({
        email: body.email,
        password: body.password,
        displayName: `${body.firstName} ${body.lastName}`,
        phoneNumber: body.phone ? body.phone.replace(/\s+/g, '') : undefined,
        emailVerified: true,
        disabled: false
      });

      ProductionLogger.info('Firebase user created successfully:', { uid: firebaseUser.uid, email: firebaseUser.email });
    } catch (firebaseError: any) {
      ProductionLogger.error('Error creating Firebase user:', firebaseError);
      return NextResponse.json({
        error: 'Failed to create Firebase user',
        details: firebaseError.message
      }, { status: 500 });
    }

    // Hash password (using bcryptjs as per package.json)
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create User and Agent profile transactionally
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          id: firebaseUser.uid, // Use Firebase UID as database ID
          email: body.email,
          password: hashedPassword,
          firstName: body.firstName,
          lastName: body.lastName,
          displayName: `${body.firstName} ${body.lastName}`,
          phoneNumber: body.phone,
          role: 'agent',
          isActive: true,
          isVerified: true, // Auto-verify created agents?
        }
      });

      // 2. Create Agent Profile
      const agent = await tx.agent.create({
        data: {
          userId: user.id,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          nin: body.nin || `NIN-${Date.now()}`, // Temporary NIN if not provided
          state: body.state,
          localGovernment: body.lga,
          assignedState: body.assignedState || body.state,
          assignedLGA: body.assignedLGA || body.lga,
          status: 'active',
          createdByUserId: (session.user as any).id
        }
      });

      return { user, agent };
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
