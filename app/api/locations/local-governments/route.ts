import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const stateId = searchParams.get('stateId');

    if (!stateId) {
      return NextResponse.json({
        success: false,
        message: 'State ID is required'
      }, { status: 400 });
    }

    const localGovernments = await prisma.localGovernment.findMany({
      where: {
        stateId: stateId
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: localGovernments
    });
  } catch (error) {
    console.error('Error fetching local governments:', error);
    
    // Return empty array as fallback
    return NextResponse.json({
      success: true,
      data: [],
      note: 'No local governments found or database error'
    });
  }
}
