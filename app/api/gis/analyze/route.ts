import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Helper to generate random stats based on type
const generateStats = (type: string) => {
    switch (type) {
        case 'NDVI':
            return {
                mean: (0.4 + Math.random() * 0.4).toFixed(3), // 0.4 - 0.8 (Healthy)
                min: (0.2 + Math.random() * 0.2).toFixed(3),
                max: (0.8 + Math.random() * 0.1).toFixed(3),
                unit: 'Index'
            };
        case 'SOIL_MOISTURE':
            return {
                mean: (0.2 + Math.random() * 0.15).toFixed(3),
                min: 0.1,
                max: 0.45,
                unit: 'cm³/cm³'
            };
        case 'PRECIPITATION':
            return {
                total: (50 + Math.random() * 100).toFixed(1),
                unit: 'mm'
            };
        case 'ELEVATION':
            return {
                mean: (150 + Math.random() * 50).toFixed(0),
                unit: 'm'
            };
        default:
            return {};
    }
};

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { polygon, type, dateRange } = await request.json();

        if (!type) {
            return NextResponse.json({ error: 'Analysis type is required' }, { status: 400 });
        }

        // SIMULATED GEE DELAY
        await new Promise(resolve => setTimeout(resolve, 1500));

        // MOCK RESPONSE
        // In a real implementation:
        // 1. Authenticate with GEE Private Key
        // 2. ee.Initialize()
        // 3. Run computation on 'polygon'
        // 4. Return mapId.urlFormat and reduceRegion stats

        const stats = generateStats(type);

        return NextResponse.json({
            success: true,
            data: {
                stats,
                // Mocking a tile URL. In reality this comes from GEE.
                // We'll return null for now to avoid broken map tiles, 
                // but the frontend is ready to accept a URL format like:
                // "https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/1234abcd/tiles/{z}/{x}/{y}"
                tileUrl: null
            }
        });

    } catch (error) {
        console.error('GIS Analyze Error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
