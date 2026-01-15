import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

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
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role
          }
        }
      };
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
      roles: user.userRoles.map(ur => ur.role),
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
      roleId, // This will be the role ID
      isActive = true,
      password,
    } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        isActive,
        displayName: `${firstName} ${lastName}`,
        userRoles: roleId ? {
          create: {
            roleId: roleId
          }
        } : undefined
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
