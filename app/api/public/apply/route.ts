import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.firstName || !body.lastName || !body.email || !body.phone || !body.state) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check for existing agent/user
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: body.email },
                    { phoneNumber: body.phone }
                ]
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'An account with this email or phone already exists.' }, { status: 409 });
        }

        // We need to create a User record because Agent is relationally tied to User.
        // Since this is a public application, we can generate a temporary password or leave it effectively unusable until "Accepted".
        // Strategy: Create User with random password, but `isActive: false` (or dedicated status) so they can't login yet?
        // OR: Just create the User/Agent but set Agent status to 'Applied'.

        // Let's create a User with a placeholder password.
        // In a real app, we might just store this in a separate "Applications" table. 
        // But per instructions, we are using the Agent schema.

        const placeholderPassword = await bcrypt.hash(`Temp@${Date.now()}`, 10);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    email: body.email,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    displayName: `${body.firstName} ${body.lastName}`,
                    phoneNumber: body.phone,
                    password: placeholderPassword,
                    role: 'agent',
                    isActive: false, // Inactive until approved
                    isVerified: false,
                }
            });

            // 2. Create Agent Profile
            const agent = await tx.agent.create({
                data: {
                    userId: user.id,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    email: body.email,
                    phone: body.phone,
                    state: body.state,
                    localGovernment: body.lga,
                    ward: body.ward,
                    pollingUnit: body.pollingUnit,
                    nin: `TEMP-${Date.now()}`, // Placeholder NIN until collected
                    status: 'Applied', // <--- Key pipeline status
                    gender: body.gender,
                }
            });

            return agent;
        });

        return NextResponse.json({ success: true, id: result.id }, { status: 201 });

    } catch (error: any) {
        console.error('Application submission error:', error);

        // Handle unique constraint violations
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            let message = 'Duplicate entry found.';

            if (Array.isArray(target)) {
                if (target.includes('email')) message = 'This email address is already registered.';
                else if (target.includes('phone') || target.includes('phoneNumber')) message = 'This phone number is already registered.';
                else if (target.includes('nin')) message = 'This NIN is already associated with an application.';
                else if (target.includes('bvn')) message = 'This BVN is already registered.';
            }

            return NextResponse.json({ error: message }, { status: 409 });
        }

        return NextResponse.json({
            error: error.message || 'Internal server error',
        }, { status: 500 });
    }
}
