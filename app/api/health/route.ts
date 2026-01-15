import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};
  let status = 'healthy';

  try {
    // 1. Database Connectivity
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: Date.now() - startTime };

    // 2. Table Counts (Deep Diagnostics)
    const [
      userCount,
      agentCount,
      farmerCount,
      farmCount,
      clusterCount,
      certificateCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.agent.count(),
      prisma.farmer.count(),
      prisma.farm.count(),
      prisma.cluster.count(),
      prisma.certificate.count()
    ]);

    checks.metrics = {
      users: userCount,
      agents: agentCount,
      farmers: farmerCount,
      farms: farmCount,
      clusters: clusterCount,
      certificates: certificateCount
    };

    // 3. Environment Check
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];
    const missingEnv = requiredEnvVars.filter(env => !process.env[env]);

    if (missingEnv.length > 0) {
      status = 'degraded';
      checks.environment = { status: 'warning', missing: missingEnv };
    } else {
      checks.environment = { status: 'healthy' };
    }

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      service: 'CCSA FIMS Backend API',
      version: '1.0.0',
      duration: Date.now() - startTime,
      checks
    });

  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'CCSA FIMS Backend API',
      error: error.message
    }, { status: 503 });
  }
}
