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
    const state = searchParams.get('state') || '';
    const lga = searchParams.get('lga') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    // We want to fetch all users with role 'agent', even if they don't have a complete agent profile yet
    const where: Prisma.UserWhereInput = {
      role: 'agent',
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

    // Initialize agent conditions if not already present
    // Since we set agent: { isNot: null } above, we need to be careful with subsequent assignments
    // We should build the agent where input object separately
    const agentWhere: Prisma.AgentWhereInput = {};

    if (status === 'active') {
      where.isActive = true;
      agentWhere.status = 'active'; 
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (['Applied', 'CallForInterview', 'Accepted', 'Rejected', 'Enrolled', 'pending'].includes(status)) {
      agentWhere.status = status;
    }

    if (state) {
      agentWhere.assignedState = { contains: state, mode: 'insensitive' };
    }
    
    if (lga) {
      agentWhere.assignedLGA = { contains: lga, mode: 'insensitive' };
    }

    // Assign collected agent filters to the main where clause
    if (Object.keys(agentWhere).length > 0) {
      where.agent = agentWhere;
    }

    // Date filtering for farmers count
    const farmersWhere: Prisma.FarmerWhereInput = {};
    if (startDate || endDate) {
      farmersWhere.createdAt = {};
      
      if (startDate) {
        const date = new Date(startDate);
        if(!isNaN(date.getTime())) {
          farmersWhere.createdAt.gte = date;
        }
      }
      
      if (endDate) {
        const date = new Date(endDate);
        if(!isNaN(date.getTime())) {
          farmersWhere.createdAt.lte = date;
        }
      }
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
              farmers: {
                where: farmersWhere
              }
            }
          },
          agent: {
            select: {
              state: true,
              localGovernment: true,
              assignedState: true,
              assignedLGA: true,
              status: true,
              nin: true,
              gender: true
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
    if (error instanceof Error) {
        console.error('Error stack:', error.stack);
    }
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
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
