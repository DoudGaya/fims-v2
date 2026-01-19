import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

// Helper to check permissions
const checkPermission = (permissions: string[] | undefined, permission: string) => {
    return permissions?.includes(permission) || false;
};

function escapeCsv(value: any): string {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userPermissions = (session.user as any).permissions as string[];

        if (!checkPermission(userPermissions, PERMISSIONS.AGENTS_READ)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const where: Prisma.UserWhereInput = {
            role: 'agent'
        };

        // Include filters from query params if needed, but usually export implies "all" or "all matching current filter"
        // For now, let's support the same search params as the listing API for consistency
        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';

        if (search) {
            where.OR = [
                { displayName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status === 'active') {
            where.isActive = true;
            where.agent = { status: 'active' };
        } else if (status === 'inactive') {
            where.isActive = false;
        } else if (['Applied', 'CallForInterview', 'Accepted', 'Rejected', 'Enrolled'].includes(status)) {
            where.agent = { status: status };
        }

        const agents = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                displayName: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                _count: {
                    select: {
                        farmers: true
                    }
                },
                agent: {
                    select: {
                        state: true,
                        localGovernment: true,
                        ward: true,
                        address: true,
                        assignedState: true,
                        assignedLGA: true,
                        assignedWards: true,
                        status: true,
                        nin: true,
                        bvn: true,
                        bankName: true,
                        accountNumber: true,
                        accountName: true,
                        gender: true,
                        dateOfBirth: true,
                        employmentStatus: true,
                        maritalStatus: true
                    }
                }
            }
        });

        // Generate CSV
        const headers = [
            'ID',
            'Display Name',
            'First Name',
            'Last Name',
            'Email',
            'Phone Number',
            'Status',
            'Assigned State',
            'Assigned LGA',
            'Assigned Wards',
            'Registrations Count',
            'Date Joined',
            'Last Login',
            'State',
            'LGA',
            'Ward',
            'Address',
            'NIN',
            'BVN',
            'Bank Name',
            'Account Number',
            'Account Name',
            'Gender',
            'Date of Birth',
            'Employment Status',
            'Marital Status'
        ];

        const csvRows = [headers.join(',')];

        for (const agent of agents) {
            const row = [
                agent.id,
                agent.displayName,
                agent.firstName,
                agent.lastName,
                agent.email,
                agent.phoneNumber,
                agent.agent?.status || (agent.isActive ? 'Active' : 'Inactive'),
                agent.agent?.assignedState,
                agent.agent?.assignedLGA,
                Array.isArray(agent.agent?.assignedWards) ? agent.agent?.assignedWards.join(';') : '',
                agent._count.farmers,
                agent.createdAt ? new Date(agent.createdAt).toISOString().split('T')[0] : '',
                agent.lastLogin ? new Date(agent.lastLogin).toISOString() : '',
                agent.agent?.state,
                agent.agent?.localGovernment,
                agent.agent?.ward,
                agent.agent?.address,
                agent.agent?.nin,
                agent.agent?.bvn,
                agent.agent?.bankName,
                agent.agent?.accountNumber,
                agent.agent?.accountName,
                agent.agent?.gender,
                agent.agent?.dateOfBirth ? new Date(agent.agent.dateOfBirth).toISOString().split('T')[0] : '',
                agent.agent?.employmentStatus,
                agent.agent?.maritalStatus
            ].map(escapeCsv);

            csvRows.push(row.join(','));
        }

        const csvContent = csvRows.join('\n');

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="agents_report_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('Error exporting agents:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
