import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
export const dynamic = "force-dynamic";
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

    // Find the user first
    const userRecord = await prisma.user.findUnique({
      where: { id: agentUserId },
      select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found. Please ensure you are logged in.' }, { status: 404 });
    }
    
    console.log(`[ATTENDANCE] User found: ${userRecord.email}, Role: ${userRecord.role}`);

    // Find or create Agent record
    let agent = await prisma.agent.findUnique({
      where: { userId: agentUserId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!agent) {
      // Check if an agent with this phone number already exists
      const existingAgentByPhone = await prisma.agent.findUnique({
        where: { phone: userRecord.phoneNumber || 'Unknown' },
        select: { id: true, firstName: true, lastName: true, userId: true }
      });

      if (existingAgentByPhone) {
        console.log(`[ATTENDANCE] Found existing agent by phone: ${userRecord.phoneNumber}, linking to user ${agentUserId}`);
        agent = existingAgentByPhone;
        
        if (existingAgentByPhone.userId !== agentUserId) {
          await prisma.agent.update({
            where: { id: existingAgentByPhone.id },
            data: { userId: agentUserId }
          });
        }
      } else {
        // Create Agent record if it doesn't exist
        agent = await prisma.agent.create({
          data: {
            userId: agentUserId,
            nin: `temp_${Date.now()}`,
            firstName: userRecord.firstName || 'Unknown',
            lastName: userRecord.lastName || 'User',
            phone: userRecord.phoneNumber || `temp_phone_${Date.now()}`,
            email: userRecord.email,
            status: 'active'
          },
          select: { id: true, firstName: true, lastName: true }
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

    let whereClause: any = {};

    if (agentId) {
      const userRecord = await prisma.user.findUnique({
        where: { id: agentId },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
      });
      
      if (userRecord) {
        let agent = await prisma.agent.findUnique({
          where: { userId: agentId },
          select: { id: true }
        });

        if (!agent) {
          agent = await prisma.agent.create({
            data: {
              userId: agentId,
              nin: `temp_${Date.now()}`,
              firstName: userRecord.firstName || 'Unknown',
              lastName: userRecord.lastName || 'User',
              phone: userRecord.phoneNumber || 'Unknown',
              email: userRecord.email,
              status: 'active'
            },
            select: { id: true }
          });
        }
        
        whereClause.agentId = agent.id;
      }
    } else {
      const userRecord = await prisma.user.findUnique({
        where: { id: (user as any).id },
        select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, role: true }
      });
      
      if (userRecord) {
        let agent = await prisma.agent.findUnique({
          where: { userId: (user as any).id },
          select: { id: true }
        });

        if (!agent) {
          agent = await prisma.agent.create({
            data: {
              userId: (user as any).id,
              nin: `temp_${Date.now()}`,
              firstName: userRecord.firstName || 'Unknown',
              lastName: userRecord.lastName || 'User',
              phone: userRecord.phoneNumber || 'Unknown',
              email: userRecord.email,
              status: 'active'
            },
            select: { id: true }
          });
        }
        
        whereClause.agentId = agent.id;
      }
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
