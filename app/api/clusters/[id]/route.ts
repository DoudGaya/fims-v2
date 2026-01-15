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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';

    // Calculate skip
    const skip = (page - 1) * limit;

    // Build filter
    const where: any = { clusterId: id };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { nin: { contains: search } },
      ];
    }

    if (statusFilter !== 'all') {
      where.status = { equals: statusFilter, mode: 'insensitive' };
    }

    // Parallel Data Fetching
    const [cluster, farmers, totalFarmers, statusStats, genderStats, locationStats, growthStats] = await Promise.all([
      // 1. Cluster Metadata (without farmers)
      prisma.cluster.findUnique({
        where: { id },
        include: {
          _count: { select: { farmers: true } }
        }
      }),

      // 2. Paginated Farmers
      prisma.farmer.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nin: true,
          phone: true,
          email: true,
          state: true,
          lga: true,
          status: true,
          createdAt: true,
          gender: true,
        }
      }),

      // 3. Total Count for Pagination
      prisma.farmer.count({ where }),

      // 4. Status Stats (for entire cluster, ignoring search/page)
      prisma.farmer.groupBy({
        by: ['status'],
        where: { clusterId: id },
        _count: { status: true }
      }),

      // 5. Gender Stats
      prisma.farmer.groupBy({
        by: ['gender'],
        where: { clusterId: id },
        _count: { gender: true }
      }),

      // 6. Location Stats (Top LGAs)
      prisma.farmer.groupBy({
        by: ['lga'],
        where: { clusterId: id },
        _count: { lga: true },
        orderBy: {
          _count: { lga: 'desc' }
        },
        take: 5
      }),

      // 7. Growth Stats (Last 6 months)
      prisma.farmer.groupBy({
        by: ['createdAt'],
        where: { clusterId: id },
        _count: { createdAt: true }
        // Note: Prisma groupBy on date is granular. We process this usually better on client or raw query.
        // Falling back to a raw query for date truncation or a simplified fetch for growth.
        // For simplicity/reliability in this env, we'll fetch just dates of all farmers (lightweight) if count < 2000, 
        // or just use the basic count. Let's stick to fetching id+createdAt for all to accurate grouping if dataset isn't huge.
        // OR better: Just return the raw counts by status/etc and let client handle limited logical complexity.
      })
    ]);

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Helper to process growth data reliably without massive fetch
    // We will just fetch the createdAt of ALL farmers in this cluster for the growth chart. 
    // This is generally safe for < 10k records.
    const allFarmerDates = await prisma.farmer.findMany({
      where: { clusterId: id },
      select: { createdAt: true }
    });


    return NextResponse.json({
      cluster,
      farmers,
      pagination: {
        total: totalFarmers,
        pages: Math.ceil(totalFarmers / limit),
        current: page,
        limit
      },
      analytics: {
        status: statusStats,
        gender: genderStats,
        location: locationStats,
        growth: allFarmerDates
      }
    });

  } catch (error) {
    console.error('Error fetching cluster:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cluster' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = clusterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if cluster exists
    const existingCluster = await prisma.cluster.findUnique({
      where: { id }
    });

    if (!existingCluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Check if title is being changed and if new title already exists
    if (data.title !== existingCluster.title) {
      const duplicateCluster = await prisma.cluster.findFirst({
        where: {
          title: { equals: data.title, mode: 'insensitive' },
          id: { not: id }
        }
      });

      if (duplicateCluster) {
        return NextResponse.json(
          { error: 'Cluster with this title already exists' },
          { status: 409 }
        );
      }
    }

    const cluster = await prisma.cluster.update({
      where: { id },
      data: {
        ...data,
      },
      include: {
        _count: {
          select: { farmers: true }
        }
      }
    });

    return NextResponse.json(cluster);
  } catch (error) {
    console.error('Error updating cluster:', error);
    return NextResponse.json(
      { error: 'Failed to update cluster' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if cluster exists
    const cluster = await prisma.cluster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { farmers: true }
        }
      }
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Check if cluster has farmers
    if (cluster._count.farmers > 0) {
      return NextResponse.json(
        { error: `Cannot delete cluster with assigned farmers. Please reassign ${cluster._count.farmers} farmers first.` },
        { status: 400 }
      );
    }

    await prisma.cluster.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Cluster deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cluster:', error);
    return NextResponse.json(
      { error: 'Failed to delete cluster' },
      { status: 500 }
    );
  }
}
