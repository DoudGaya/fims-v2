import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// Validation schema for attendance data
const attendanceSchema = z.object({
  type: z.enum(['check_in', 'check_out']),
  timestamp: z.string().datetime(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
    timestamp: z.string().optional(),
  }),
  agentId: z.string().optional(),
  date: z.string(),
  duration: z.number().optional(),
});

async function getAuthenticatedUser(req: NextRequest) {
  // Try Firebase authentication first (for mobile app)
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decodedToken = await verifyFirebaseToken(token);
      return { id: decodedToken.uid, email: decodedToken.email };
    } catch (firebaseError) {
      console.log('Firebase auth failed, trying NextAuth...');
    }
  }
  
  // Fallback to NextAuth session (for web app)
  const session = await getServerSession(authOptions);
  if (session && session.user) {
    return session.user;
  }
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = attendanceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Invalid data',
        details: validationResult.error.format()
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Get agent ID from request or user
    const agentUserId = validatedData.agentId || (user as any).id;
    const authenticatedEmail = (user as any)?.email;

    // Find the user by ID, Firebase UID, or authenticated email
    const userRecord = await prisma.user.findFirst({
      where: {
        OR: [
          { id: agentUserId },
          { firebaseUid: agentUserId },
          ...(authenticatedEmail ? [{ email: authenticatedEmail }] : []),
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true, firebaseUid: true }
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found. Please ensure you are logged in.' }, { status: 404 });
    }
    
    console.log(`[ATTENDANCE] User found: ${userRecord.email}, Role: ${userRecord.role}`);

    // Find or create Agent record using userRecord.id or email
    let agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { userId: userRecord.id },
          ...(userRecord.email ? [{ email: userRecord.email }] : []),
        ],
      },
      select: { id: true, firstName: true, lastName: true, userId: true }
    });

    if (!agent) {
      // Check if an agent with this phone number already exists
      const existingAgentByPhone = await prisma.agent.findFirst({
        where: { phone: userRecord.phoneNumber || 'Unknown' },
        select: { id: true, firstName: true, lastName: true, userId: true }
      });

      if (existingAgentByPhone) {
        console.log(`[ATTENDANCE] Found existing agent by phone: ${userRecord.phoneNumber}, linking to user ${userRecord.id}`);
        agent = existingAgentByPhone;
        
        if (existingAgentByPhone.userId !== userRecord.id) {
          await prisma.agent.update({
            where: { id: existingAgentByPhone.id },
            data: { userId: userRecord.id }
          });
        }
      } else {
        // Create Agent record if it doesn't exist
        agent = await prisma.agent.create({
          data: {
            userId: userRecord.id,
            nin: `temp_${Date.now()}`,
            firstName: userRecord.firstName || 'Unknown',
            lastName: userRecord.lastName || 'User',
            phone: userRecord.phoneNumber || `temp_phone_${Date.now()}`,
            email: userRecord.email,
            status: 'active'
          },
          select: { id: true, firstName: true, lastName: true, userId: true }
        });
      }
    }
    
    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        agentId: agent.id,
        type: validatedData.type,
        timestamp: new Date(validatedData.timestamp),
        location: validatedData.location,
        date: validatedData.date,
        duration: validatedData.duration,
      },
    });

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        type: attendance.type,
        timestamp: attendance.timestamp,
        location: attendance.location,
        date: attendance.date,
        duration: attendance.duration,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = {};
    const authenticatedEmail = (user as any)?.email;
    const callerId = (user as any)?.id;

    // Resolve the calling user (supports CUID, Firebase UID, or email)
    const callerUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(callerId ? [{ id: callerId }, { firebaseUid: callerId }] : []),
          ...(authenticatedEmail ? [{ email: authenticatedEmail }] : []),
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
    });

    if (!callerUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    const isPrivileged = ['admin', 'super_admin', 'coordinator', 'supervisor'].includes(callerUser.role);

    // If an agentId was specified in query params:
    if (agentId) {
      const targetAgent = await prisma.agent.findFirst({
        where: {
          OR: [
            { id: agentId },
            { userId: agentId },
            { user: { OR: [{ id: agentId }, { firebaseUid: agentId }, { email: agentId }] } },
          ],
        },
        select: { id: true, userId: true }
      });

      if (!isPrivileged && targetAgent && targetAgent.userId !== callerUser.id) {
        return NextResponse.json({ error: 'Forbidden: You can only view your own attendance' }, { status: 403 });
      }

      if (targetAgent) {
        whereClause.agentId = targetAgent.id;
      } else {
        return NextResponse.json({
          attendanceRecords: [],
          summary: { totalRecords: 0, checkIns: 0, checkOuts: 0, totalDuration: 0 },
          pagination: { limit, total: 0 }
        });
      }
    } else {
      // If no agentId specified:
      if (!isPrivileged) {
        // Field agents can only see their own attendance records
        const callerAgent = await prisma.agent.findFirst({
          where: {
            OR: [
              { userId: callerUser.id },
              ...(callerUser.email ? [{ email: callerUser.email }] : []),
            ],
          },
          select: { id: true }
        });

        if (callerAgent) {
          whereClause.agentId = callerAgent.id;
        } else {
          return NextResponse.json({
            attendanceRecords: [],
            summary: { totalRecords: 0, checkIns: 0, checkOuts: 0, totalDuration: 0 },
            pagination: { limit, total: 0 }
          });
        }
      }
      // If privileged, leave whereClause.agentId unset to allow seeing all agents' attendance
    }

    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    const summary = {
      totalRecords: attendanceRecords.length,
      checkIns: attendanceRecords.filter(r => r.type === 'check_in').length,
      checkOuts: attendanceRecords.filter(r => r.type === 'check_out').length,
      totalDuration: attendanceRecords
        .filter(r => r.type === 'check_out' && r.duration)
        .reduce((total, r) => total + (r.duration || 0), 0),
    };

    return NextResponse.json({
      attendanceRecords,
      summary,
      pagination: {
        limit,
        total: attendanceRecords.length,
      }
    });

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
