import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { analyzeWeather, analyzeSoilPH, analyzeSoilMoisture, analyzeNDVI, initGEE } from '@/lib/gee';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { farmId, variable, dateRange } = body;

    if (!farmId || !variable) {
      return NextResponse.json({ error: 'Missing farmId or variable' }, { status: 400 });
    }

    // 1. Fetch Farm Geometry
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: { id: true, farmPolygon: true, farmCoordinates: true }
    });

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    // Prefer polygon, fallback to stored coordinates/point
    const geometry = farm.farmPolygon || farm.farmCoordinates;
    if (!geometry) {
      return NextResponse.json({ error: 'No geometry data found for this farm' }, { status: 400 });
    }

    // 2. Check Cache
    // We invalidate cache if it's older than 24h for weather, or 30 days for soil/static data
    // For simplicity, we'll just check if one exists for the variable recently.
    const cutoff = new Date();
    if (variable === 'weather') {
        cutoff.setHours(cutoff.getHours() - 1); // 1 hour cache for weather
    } else {
        cutoff.setDate(cutoff.getDate() - 30); // 30 day cache for others
    }

    const cached = await prisma.farmAnalysisResult.findFirst({
      where: {
        farmId,
        variable,
        createdAt: { gt: cutoff }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (cached) {
      console.log(`Returning cached analysis for ${variable}`);
      return NextResponse.json({ 
        source: 'cache', 
        data: cached.result, 
        timestamp: cached.createdAt 
      });
    }

    // 3. Compute (if not cached)
    let result;
    try {
        await initGEE(); // Ensure GEE is ready
    } catch (e) {
        console.warn("GEE Init failed, falling back to mock data or erroring if critical", e);
        // We continue, as our analyze functions might work with mocks or fail gracefully
    }

    switch (variable) {
      case 'weather':
        result = await analyzeWeather(geometry);
        break;
      case 'soil_ph':
        result = await analyzeSoilPH(geometry);
        break;
      case 'soil_moisture':
        result = await analyzeSoilMoisture(geometry);
        break;
      case 'ndvi':
        result = await analyzeNDVI(geometry, dateRange || 'latest');
        break;
      default:
        return NextResponse.json({ error: 'Invalid variable' }, { status: 400 });
    }

    // 4. Save to Cache
    await prisma.farmAnalysisResult.create({
      data: {
        farmId,
        variable,
        result: result as any, // Json type
        dateRange: dateRange || 'latest',
      }
    });

    return NextResponse.json({ 
      source: 'computed', 
      data: result,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('Analysis API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
