import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parallelize queries for performance
        const [
            totalFarms,
            totalAreaResult,
            farmsByState,
            farmsByCrop
        ] = await Promise.all([
            // 1. Total Farms count
            prisma.farm.count(),

            // 2. Total Area (sum of farmSize)
            prisma.farm.aggregate({
                _sum: {
                    farmSize: true
                },
                _avg: {
                    farmSize: true
                }
            }),

            // 3. Distribution by State
            prisma.farm.groupBy({
                by: ['farmState'],
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 10 // Top 10 states
            }),

            // 4. Distribution by Primary Crop
            prisma.farm.groupBy({
                by: ['primaryCrop'],
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 5 // Top 5 crops
            })
        ]);

        const totalArea = totalAreaResult._sum.farmSize || 0;
        const avgSize = totalAreaResult._avg.farmSize || 0;

        return NextResponse.json({
            totalFarms,
            totalArea,
            avgSize,
            farmsByState,
            farmsByCrop
        });

    } catch (error) {
        console.error('Error fetching farm analytics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch farm analytics' },
            { status: 500 }
        );
    }
}
