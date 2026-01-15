import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const wardId = searchParams.get('wardId');

    if (!wardId) {
      return NextResponse.json({
        success: false,
        message: 'Ward ID is required'
      }, { status: 400 });
    }

    const pollingUnits = await prisma.pollingUnit.findMany({
      where: {
        wardId: wardId
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: pollingUnits
    });
  } catch (error) {
    console.error('Error fetching polling units:', error);
    
    // Return empty array as fallback
    return NextResponse.json({
      success: true,
      data: [],
      note: 'No polling units found or database error'
    });
  }
}
