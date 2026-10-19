import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { zoraAdmin } from '@/lib/zoraAccess';

export const dynamic = 'force-dynamic';

async function authorize() { return zoraAdmin(); }

export async function GET(req: NextRequest) {
  if (!(await authorize())) {
    return NextResponse.json({ error: 'Unauthorized or session expired.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '20')));
  const skip = (page - 1) * limit;
  const statusFilter = sp.get('status') ?? undefined;

  const where = statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {};

  const [requests, total] = await Promise.all([
    prisma.zoraAccessRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.zoraAccessRequest.count({ where }),
  ]);

  return NextResponse.json({
    data: requests.map(({ generatedPassword, ...request }) => request),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
