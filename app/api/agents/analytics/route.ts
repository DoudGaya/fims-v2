import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getCached } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userPermissions = (session.user as any).permissions as string[];

        const userRole = (session.user as any).role?.toLowerCase();
        const isPrivileged = ['admin', 'super_admin', 'manager', 'project_manager'].includes(userRole);

        // Check READ permissions for agents
        if (!isPrivileged && !userPermissions?.includes(PERMISSIONS.AGENTS_READ)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Parallel fetch for stats
        const result = await getCached(
          'fims:v1:agents:analytics',
          300, // 5 minutes
          async () => {
        const AGENT_ROLES = ['agent', 'household_agent', 'data_correction_agent', 'survey_agent', 'agri_business_agent'] as const;
        const [
            totalAgents,
            activeAgents,
            inactiveAgents,
            newApplications,
            interviewing,
            enrollmentCount,
            householdCount,
            correctionCount,
            surveyCount,
            agriBusinessCount,
            agentsByStatusRaw,
            agentsByStateRaw
        ] = await Promise.all([
            prisma.user.count({ where: { role: { in: [...AGENT_ROLES] } } }),
            prisma.user.count({ where: { role: { in: [...AGENT_ROLES] }, isActive: true, agent: { status: 'active' } } }),
            prisma.user.count({ where: { role: { in: [...AGENT_ROLES] }, isActive: false } }),
            prisma.agent.count({ where: { status: 'Applied' } }),
            prisma.agent.count({ where: { status: 'CallForInterview' } }),
            prisma.user.count({ where: { role: 'agent' } }),
            prisma.user.count({ where: { role: 'household_agent' } }),
            prisma.user.count({ where: { role: 'data_correction_agent' } }),
            prisma.user.count({ where: { role: 'survey_agent' } }),
            prisma.user.count({ where: { role: 'agri_business_agent' } }),
            // Group by Status
            prisma.agent.groupBy({
                by: ['status'],
                _count: { id: true }
            }),
            // Group by State
            prisma.agent.groupBy({
                by: ['state'],
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } }
            })
        ]);

        // Normalize Data
        const agentsByStatus = agentsByStatusRaw.reduce((acc, curr) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {} as Record<string, number>);

        const agentsByState = agentsByStateRaw
            .filter(i => i.state)
            .map(i => ({ state: i.state, count: i._count.id }))
            .slice(0, 10); // Top 10

            return {
              totalAgents,
              activeAgents,
              inactiveAgents,
              newApplications,
              interviewing,
              enrollmentCount,
              householdCount,
              correctionCount,
              surveyCount,
              agriBusinessCount,
              agentsByStatus,
              agentsByState,
            };
          }
        );

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching agent analytics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
