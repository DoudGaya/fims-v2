import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import prisma from '@/lib/prisma';

// ─── GET /api/corrections ─────────────────────────────────────────────────────
// Returns DataCorrection rows with optional status/search filtering.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canRead = await hasPermission(session.user.id, PERMISSIONS.CORRECTIONS_READ);
  if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sp     = req.nextUrl.searchParams;
  const page   = Math.max(1, parseInt(sp.get('page')   || '1'));
  const limit  = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '50')));
  const skip   = (page - 1) * limit;
  const status = sp.get('status')?.toUpperCase() || '';
  const search = sp.get('search')?.trim() || '';

  const where: Record<string, unknown> = {};
  if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
    where.status = status;
  }

  const [corrections, total] = await Promise.all([
    prisma.dataCorrection.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: {
          select: { id: true, firstName: true, middleName: true, lastName: true, nin: true },
        },
        farm: {
          select: { id: true, primaryCrop: true, farmState: true, farmLocalGovernment: true, farmSize: true },
        },
        submitter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        reviewer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.dataCorrection.count({ where }),
  ]);

  // Optional: filter by farmer name / NIN / submitter name after fetch
  let result = corrections;
  if (search) {
    const q = search.toLowerCase();
    result = corrections.filter((c) => {
      const farmerName = [c.farmer.firstName, c.farmer.middleName, c.farmer.lastName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const submitterName = `${c.submitter.firstName} ${c.submitter.lastName}`.toLowerCase();
      return (
        farmerName.includes(q) ||
        (c.farmer.nin ?? '').toLowerCase().includes(q) ||
        submitterName.includes(q)
      );
    });
  }

  return NextResponse.json({
    corrections: result,
    pagination: {
      page,
      limit,
      total: search ? result.length : total,
      pages: Math.ceil((search ? result.length : total) / limit),
    },
  });
}
