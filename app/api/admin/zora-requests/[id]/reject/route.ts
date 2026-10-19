import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { zoraAdmin } from '@/lib/zoraAccess';

export const dynamic = 'force-dynamic';

async function authorize() { return zoraAdmin(); }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorize())) {
    return NextResponse.json({ error: 'Unauthorized or session expired.' }, { status: 401 });
  }

  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const updated = await prisma.zoraAccessRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      adminNotes: body.adminNotes?.trim() || null,
    },
  });

  return NextResponse.json({
    message: 'Access request has been declined.',
    request: { id: updated.id, status: updated.status },
  });
}
