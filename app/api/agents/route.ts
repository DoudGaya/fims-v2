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
import { getCached, cacheKey, invalidateByPrefix } from '@/lib/cache';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
  return permissions?.includes(permission) || false;
};

// All mobile agent roles managed from this dashboard
const MOBILE_AGENT_ROLES = ['agent', 'data_correction_agent', 'survey_agent', 'agri_business_agent'] as const;

// Map agentType param → User.role value
const AGENT_TYPE_ROLE_MAP: Record<string, string> = {
  enrollment: 'agent',
  correction: 'data_correction_agent',
  survey:     'survey_agent',
  agribusiness: 'agri_business_agent',
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
    const cluster = searchParams.get('cluster') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const roleType = searchParams.get('roleType') || '';
    const skip = (page - 1) * limit;

    // Build where clause — include all three mobile agent role types
    const roleFilter = roleType && AGENT_TYPE_ROLE_MAP[roleType]
      ? AGENT_TYPE_ROLE_MAP[roleType]
      : undefined;

    const where: Prisma.UserWhereInput = {
      role: roleFilter ? roleFilter : { in: [...MOBILE_AGENT_ROLES] },
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

    if (cluster) {
      agentWhere.address = { contains: cluster, mode: 'insensitive' };
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

    // Execute query — cache keyed by all filter/pagination params
    const key = cacheKey('agents', { page, limit, search, status, state, lga, cluster, startDate, endDate, roleType });
    const result = await getCached(key, 300, async () => {
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
          role: true,   // enrollment role type returned here
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
              gender: true,
              employmentStatus: true,
              totalFarmersRegistered: true,  // correction agents track corrections here
              performanceRating: true,
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

      // Build survey-response count map for survey agents on this page
      const surveyAgentIds = agents
        .filter(a => a.role === 'survey_agent')
        .map(a => a.id);
      const surveyCountMap: Record<string, number> = {};
      if (surveyAgentIds.length > 0) {
        const rows = await prisma.surveyResponse.groupBy({
          by: ['submittedByUserId'],
          where: { submittedByUserId: { in: surveyAgentIds } },
          _count: { id: true },
        });
        for (const row of rows) {
          if (row.submittedByUserId) surveyCountMap[row.submittedByUserId] = row._count.id;
        }
      }

      const agentsWithPerf = agents.map(a => ({ ...a, surveyCount: surveyCountMap[a.id] ?? 0 }));

      return {
        agents: agentsWithPerf,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    });

    return NextResponse.json(result);

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
          role: AGENT_TYPE_ROLE_MAP[body.agentType ?? 'enrollment'] ?? 'agent',
          isActive: true,
          isVerified: true,
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

    await invalidateByPrefix('fims:v1:agents');

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/agents — batch activate / deactivate / delete ────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userPermissions = (session.user as any).permissions as string[];

    const body = await req.json() as { ids?: string[]; action?: string };
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    if (!['activate', 'deactivate', 'delete'].includes(action ?? '')) {
      return NextResponse.json({ error: 'action must be activate, deactivate, or delete' }, { status: 400 });
    }

    if (action === 'delete') {
      if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_DELETE)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      await prisma.user.deleteMany({ where: { id: { in: ids }, role: { in: [...MOBILE_AGENT_ROLES] } } });
      await invalidateByPrefix('fims:v1:agents');
      return NextResponse.json({ success: true, affected: ids.length });
    }

    if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_UPDATE)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const isActive = action === 'activate';
    const agentStatus = isActive ? 'active' : 'inactive';

    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: ids }, role: { in: [...MOBILE_AGENT_ROLES] } }, data: { isActive } }),
      prisma.agent.updateMany({ where: { userId: { in: ids } }, data: { status: agentStatus } }),
    ]);

    await invalidateByPrefix('fims:v1:agents');
    return NextResponse.json({ success: true, affected: ids.length });

  } catch (error) {
    console.error('Error in batch agent action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
