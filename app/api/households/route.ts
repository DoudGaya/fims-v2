import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '@/lib/permissions';
import { ROLE_PERMISSIONS } from '@/lib/rolePermissions';

function checkHouseholdPermission(session: any, permission = PERMISSIONS.HOUSEHOLDS_READ): boolean {
  if (!session?.user) return false;
  const user = session.user as any;
  const role = (user.role || '').toLowerCase();

  // Privileged administrative roles always have access
  if (['admin', 'super_admin', 'manager'].includes(role)) return true;

  // Check userRoles array if attached to session
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  if (userRoles.some((r: any) => {
    const name = (typeof r === 'string' ? r : r?.name || '').toLowerCase();
    return ['admin', 'super_admin', 'manager'].includes(name);
  })) {
    return true;
  }

  // Check session permissions array
  const permissions: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.includes(permission)) return true;

  // Check role default permissions
  const roleDefaults = ROLE_PERMISSIONS[role] || [];
  if (roleDefaults.includes(permission)) return true;

  // Backwards compatibility for existing active sessions
  if (
    permission === PERMISSIONS.HOUSEHOLDS_READ &&
    (permissions.includes(PERMISSIONS.FARMERS_READ) || permissions.includes(PERMISSIONS.DASHBOARD_ACCESS))
  ) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkHouseholdPermission(session, PERMISSIONS.HOUSEHOLDS_READ)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const isExport = sp.get('export') === 'csv';
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = isExport ? 10000 : Math.min(100, Math.max(1, parseInt(sp.get('limit') || '25')));
    const skip = (page - 1) * limit;

    const search = sp.get('search') || sp.get('query') || '';
    const state = sp.get('state') || '';
    const lga = sp.get('lga') || '';
    const ward = sp.get('ward') || '';
    const telco = sp.get('telco') || '';
    const network = sp.get('network') || '';
    const hasPue = sp.get('hasPue');
    const pueType = sp.get('pueType') || '';
    const status = sp.get('status') || '';

    const where: Prisma.HouseholdWhereInput = {};

    if (search) {
      where.OR = [
        { houseNumber: { contains: search, mode: 'insensitive' } },
        { headFirstName: { contains: search, mode: 'insensitive' } },
        { headLastName: { contains: search, mode: 'insensitive' } },
        { headPhone: { contains: search, mode: 'insensitive' } },
        { headNin: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (state && state !== 'all') where.state = { equals: state, mode: 'insensitive' };
    if (lga && lga !== 'all') where.lga = { equals: lga, mode: 'insensitive' };
    if (ward && ward !== 'all') where.ward = { equals: ward, mode: 'insensitive' };
    if (status && status !== 'all') where.interventionStatus = status;
    if (network && network !== 'all') where.networkType = network;
    if (pueType && pueType !== 'all') where.pueType = pueType;
    if (hasPue === 'true') where.hasPUE = true;
    if (hasPue === 'false') where.hasPUE = false;
    if (telco && telco !== 'all') {
      where.telcoProviders = { has: telco.toUpperCase() };
    }

    // Export to CSV if requested
    if (isExport) {
      const records = await prisma.household.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      const headers = [
        'House Number',
        'Head Full Name',
        'Phone Number',
        'NIN',
        'Gender',
        'State',
        'LGA',
        'Ward',
        'Polling Unit',
        'Latitude',
        'Longitude',
        'Wives Count',
        'Children Count',
        'Total Members',
        'Telco Providers',
        'Network Type',
        'Commercial Customers',
        'PUE Enabled',
        'PUE Type',
        'Energy Source',
        'Status',
        'Agent Name',
        'Captured Date',
      ];

      const csvRows = [headers.join(',')];
      for (const r of records) {
        const row = [
          `"${r.houseNumber}"`,
          `"${r.headFirstName} ${r.headLastName}"`,
          `"${r.headPhone}"`,
          `"${r.headNin || ''}"`,
          `"${r.headGender}"`,
          `"${r.state}"`,
          `"${r.lga}"`,
          `"${r.ward}"`,
          `"${r.pollingUnit}"`,
          r.latitude || '',
          r.longitude || '',
          r.wivesCount,
          r.childrenCount,
          r.totalHouseholdMembers,
          `"${(r.telcoProviders || []).join(', ')}"`,
          `"${r.networkType || ''}"`,
          r.commercialCustomersCount,
          r.hasPUE ? 'Yes' : 'No',
          `"${r.pueType || ''}"`,
          `"${r.primaryEnergySource || ''}"`,
          `"${r.interventionStatus}"`,
          `"${r.agent ? `${r.agent.firstName} ${r.agent.lastName}` : ''}"`,
          `"${new Date(r.createdAt).toISOString()}"`,
        ];
        csvRows.push(row.join(','));
      }

      return new NextResponse(csvRows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="households_export_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Standard paginated fetch + aggregates
    const [households, total, allStats] = await Promise.all([
      prisma.household.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.household.count({ where }),
      prisma.household.aggregate({
        _sum: {
          totalHouseholdMembers: true,
          childrenCount: true,
          commercialCustomersCount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    const pueCount = await prisma.household.count({ where: { hasPUE: true } });

    return NextResponse.json({
      households,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalHouseholds: allStats._count.id || 0,
        totalMembers: allStats._sum.totalHouseholdMembers || 0,
        totalChildren: allStats._sum.childrenCount || 0,
        totalCommercialCustomers: allStats._sum.commercialCustomersCount || 0,
        pueAdopters: pueCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin households:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
