import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const clusterSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  clusterLeadFirstName: z.string().min(1, "First Name is required"),
  clusterLeadLastName: z.string().min(1, "Last Name is required"),
  clusterLeadEmail: z.string().email("Invalid email address"),
  clusterLeadPhone: z.string().min(1, "Phone number is required"),
  clusterLeadNIN: z.string().optional(),
  clusterLeadState: z.string().optional(),
  clusterLeadLGA: z.string().optional(),
  clusterLeadWard: z.string().optional(),
  clusterLeadPollingUnit: z.string().optional(),
  clusterLeadPosition: z.string().optional(),
  clusterLeadAddress: z.string().optional(),
  clusterLeadDateOfBirth: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  clusterLeadGender: z.string().optional(),
  clusterLeadMaritalStatus: z.string().optional(),
  clusterLeadEmploymentStatus: z.string().optional(),
  clusterLeadBVN: z.string().optional(),
  clusterLeadBankName: z.string().optional(),
  clusterLeadAccountNumber: z.string().optional(),
  clusterLeadAccountName: z.string().optional(),
  clusterLeadAlternativePhone: z.string().optional(),
  clusterLeadWhatsAppNumber: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const whereClause = search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { clusterLeadFirstName: { contains: search, mode: 'insensitive' as const } },
        { clusterLeadLastName: { contains: search, mode: 'insensitive' as const } },
        { clusterLeadEmail: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [clusters, total, activeClusters, totalFarmers, totalFarms, topClusters] = await Promise.all([
      prisma.cluster.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { farmers: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cluster.count({ where: whereClause }),
      prisma.cluster.count({ where: { isActive: true } }),
      prisma.farmer.count({ where: { clusterId: { not: null } } }),
      prisma.farm.count({ where: { farmer: { clusterId: { not: null } } } }), // Farms belonging to farmers in clusters
      prisma.cluster.findMany({
        take: 5,
        orderBy: {
          farmers: {
            _count: 'desc'
          }
        },
        select: {
          title: true,
          _count: {
            select: { farmers: true }
          }
        }
      })
    ]);

    return NextResponse.json({
      clusters,
      totalCount: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalClusters: total, // Using total from search might be misleading for overall stats, but usually stats are global. Let's make stats GLOBAL.
        activeClusters,
        totalFarmers,
        totalFarms
      },
      topClusters: topClusters.map(c => ({ name: c.title, value: c._count.farmers }))
    });
  } catch (error) {
    console.error('Error fetching clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clusters' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = clusterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if cluster with same title already exists
    const existingCluster = await prisma.cluster.findFirst({
      where: { title: { equals: data.title, mode: 'insensitive' } }
    });

    if (existingCluster) {
      return NextResponse.json(
        { error: 'Cluster with this title already exists' },
        { status: 409 }
      );
    }

    const cluster = await prisma.cluster.create({
      data: {
        ...data,
      },
      include: {
        _count: {
          select: { farmers: true }
        }
      }
    });

    return NextResponse.json(cluster, { status: 201 });
  } catch (error) {
    console.error('Error creating cluster:', error);
    return NextResponse.json(
      { error: 'Failed to create cluster' },
      { status: 500 }
    );
  }
}
