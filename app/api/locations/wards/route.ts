import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const lgaId = searchParams.get('lgaId');

    if (!lgaId) {
      return NextResponse.json({
        success: false,
        message: 'LGA ID is required'
      }, { status: 400 });
    }

    const wards = await prisma.ward.findMany({
      where: {
        localGovernmentId: lgaId
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: wards
    });
  } catch (error) {
    console.error('Error fetching wards:', error);
    
    // Return empty array as fallback
    return NextResponse.json({
      success: true,
      data: [],
      note: 'No wards found or database error'
    });
  }
}
