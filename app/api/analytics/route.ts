import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const selectedState = searchParams.get('state');

    // If state is selected, ONLY fetch LGA stats to save performance
    if (selectedState) {
      const lgaStatsRaw: any[] = await prisma.$queryRaw`
        SELECT INITCAP(TRIM(lga)) as lga, COUNT(*)::int as count
        FROM farmers
        WHERE state ILIKE ${'%' + selectedState + '%'} AND lga IS NOT NULL
        GROUP BY INITCAP(TRIM(lga))
        ORDER BY count DESC
      `;

      const lgasFormatted = lgaStatsRaw.map((item: any) => ({
        name: item.lga,
        value: Number(item.count)
      }));

      return NextResponse.json({
        summary: {}, // Not needed for LGA update
        charts: {
          lgas: lgasFormatted
        }
      });
    }

    const [
      totalFarmers,
      totalFarms,
      totalAgents,
      totalClusters,
      totalAreaResult,
      genderStatsRaw,
      cropStatsRaw,
      stateStatsRaw,
      farmersWithDob,
      registrationHistory,
      farmSizeStatsRaw
    ] = await Promise.all([
      // 1. KPI Counts
      prisma.farmer.count(),
      prisma.farm.count(),
      prisma.agent.count(),
      prisma.cluster.count(),
      prisma.farm.aggregate({
        _sum: {
          farmSize: true
        }
      }),

      // 2. Demographics - Gender (Strict Male/Female)
      prisma.$queryRaw`
        SELECT INITCAP(LOWER(gender)) as gender, COUNT(*)::int as count
        FROM farmers
        WHERE LOWER(gender) IN ('male', 'female')
        GROUP BY INITCAP(LOWER(gender))
      `,

      // 3. Agriculture - Crops (Case Insensitive Grouping)
      prisma.$queryRaw`
        SELECT INITCAP(TRIM("primaryCrop")) as crop, COUNT(*)::int as count
        FROM farms
        WHERE "primaryCrop" IS NOT NULL
        GROUP BY INITCAP(TRIM("primaryCrop"))
        ORDER BY count DESC
      `,

      // 4. Geography - State (Normalized)
      prisma.$queryRaw`
        SELECT TRIM(REPLACE(INITCAP(TRIM(state)), ' State', '')) as state, COUNT(*)::int as count
        FROM farmers
        WHERE state IS NOT NULL
        GROUP BY TRIM(REPLACE(INITCAP(TRIM(state)), ' State', ''))
        ORDER BY count DESC
      `,

      // 5. Age Calculation (SQL Optimized)
      prisma.$queryRaw`
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, "dateOfBirth")) BETWEEN 18 AND 25 THEN '18-25'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, "dateOfBirth")) BETWEEN 26 AND 35 THEN '26-35'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, "dateOfBirth")) BETWEEN 36 AND 50 THEN '36-50'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, "dateOfBirth")) BETWEEN 51 AND 65 THEN '51-65'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, "dateOfBirth")) > 65 THEN '65+'
            ELSE 'Unknown'
          END as age_group,
          COUNT(*)::int as count
        FROM farmers
        WHERE "dateOfBirth" IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group
      `,

      // 6. Registration Trends
      prisma.$queryRaw`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COUNT(*)::int as count 
        FROM farmers 
        GROUP BY month 
        ORDER BY month ASC
      `,

      // 7. Farm Size Distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN "farmSize" < 2 THEN 'Small (<2 Ha)' 
            WHEN "farmSize" >= 2 AND "farmSize" <= 10 THEN 'Medium (2-10 Ha)' 
            WHEN "farmSize" > 10 THEN 'Large (>10 Ha)' 
            ELSE 'Unknown' 
          END as category, 
          COUNT(*)::int as count 
        FROM farms 
        GROUP BY category
      `
    ]);

    const ageStatsRaw = farmersWithDob as any[];
    const ageChartsData = ageStatsRaw.map((item: any) => ({
      name: item.age_group,
      value: Number(item.count)
    }));

    const registrations = (registrationHistory as any[]).map((item: any) => ({
      month: item.month,
      count: Number(item.count)
    }));

    const farmSizesFormatted = (farmSizeStatsRaw as any[]).map((item: any) => ({
      name: item.category,
      value: Number(item.count)
    }));

    const genderFormatted = (genderStatsRaw as any[]).map((item: any) => ({
      name: item.gender,
      value: Number(item.count)
    }));

    const statesFormatted = (stateStatsRaw as any[]).map((item: any) => ({
      name: item.state,
      value: Number(item.count)
    }));

    // Normalize crop data
    const cropChartsData = (cropStatsRaw as any[]).map((c: any) => ({
      name: c.crop || 'Unknown',
      value: Number(c.count)
    }));

    return NextResponse.json({
      summary: {
        totalFarmers,
        totalFarms,
        totalAgents,
        totalClusters,
        totalArea: totalAreaResult._sum.farmSize || 0,
      },
      charts: {
        gender: genderFormatted,
        crops: cropChartsData,
        states: statesFormatted,
        age: ageChartsData,
        registrations,
        farmSizes: farmSizesFormatted,
        lgas: [] // Empty detailed LGAs initially
      }
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
