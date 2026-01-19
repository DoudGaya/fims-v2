import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userPermissions = (session.user as any).permissions as string[];

        // Check READ permissions for agents
        if (!userPermissions?.includes(PERMISSIONS.AGENTS_READ)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Parallel fetch for stats
        const [
            totalAgents,
            activeAgents,
            inactiveAgents,
            newApplications,
            interviewing,
            agentsByStatusRaw,
            agentsByStateRaw
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'agent' } }),
            prisma.user.count({ where: { role: 'agent', isActive: true, agent: { status: 'active' } } }),
            prisma.user.count({ where: { role: 'agent', isActive: false } }),
            prisma.agent.count({ where: { status: 'Applied' } }),
            prisma.agent.count({ where: { status: 'CallForInterview' } }),
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

        return NextResponse.json({
            totalAgents,
            activeAgents,
            inactiveAgents,
            newApplications,
            interviewing,
            agentsByStatus,
            agentsByState
        });

    } catch (error) {
        console.error('Error fetching agent analytics:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
