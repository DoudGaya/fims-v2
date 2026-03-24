import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/api-key-auth';
import { redactFarmers, buildFieldVisibilityMeta } from '@/lib/sensitive-fields';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/clusters/:id
 *
 * Fetch a single cluster, plus a paginated list of its farmers.
 *
 * Query params:
 *   page   (default 1)
 *   limit  (default 20, max 100)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKey(req, 'clusters:read');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { allowSensitiveFields } = auth.apiKey;
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')));
  const skip = (page - 1) * limit;

  const cluster = await prisma.cluster.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subCluster: true,
      description: true,
      clusterLeadFirstName: true,
      clusterLeadLastName: true,
      clusterLeadEmail: true,
      clusterLeadPhone: true,
      clusterLeadState: true,
      clusterLeadLGA: true,
      clusterLeadWard: true,
      clusterLeadPosition: true,
      totalFarmers: true,
      totalFarms: true,
      totalFarmSize: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!cluster) {
    return NextResponse.json({ error: 'Not Found', message: 'Cluster not found.' }, { status: 404 });
  }

  const [farmers, farmerTotal] = await Promise.all([
    prisma.farmer.findMany({
      where: { clusterId: id },
      skip,
      take: limit,
      orderBy: { registrationDate: 'desc' },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        gender: true,
        state: true,
        lga: true,
        ward: true,
        status: true,
        registrationDate: true,
        nin: true,
        bvn: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        phone: true,
        email: true,
        whatsAppNumber: true,
        _count: { select: { farms: true } },
      },
    }),
    prisma.farmer.count({ where: { clusterId: id } }),
  ]);

  return NextResponse.json({
    data: {
      ...cluster,
      farmers: redactFarmers(farmers as any[], allowSensitiveFields),
    },
    farmerPagination: {
      page,
      limit,
      total: farmerTotal,
      pages: Math.ceil(farmerTotal / limit),
    },
    meta: buildFieldVisibilityMeta(allowSensitiveFields),
  });
}
