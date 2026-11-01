import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let clusters = await prisma.cluster.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        title: 'asc',
      },
    });

    if (clusters.length === 0) {
      clusters = await prisma.cluster.findMany({
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: 'asc',
        },
      });
    }

    return NextResponse.json({ clusters });
  } catch (error) {
    console.error('Failed to fetch public clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clusters' },
      { status: 500 }
    );
  }
}

