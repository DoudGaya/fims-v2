import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { generateApiToken } from '@/lib/api-key-auth';
import { SUBSCRIPTION_PLANS, PlanKey } from '@/lib/paystack';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createKeySchema = z.object({
  name: z.string().min(2, 'Key name is required').max(100),
  description: z.string().max(250).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizationMemberships: { include: { organization: true } } },
    });

    if (!user || user.organizationMemberships.length === 0) {
      return NextResponse.json({ error: 'No associated organization found' }, { status: 404 });
    }

    const org = user.organizationMemberships[0].organization;

    // Strict Enforcement: Live keys are only allowed after payment
    const hasPaidInvoice = await prisma.invoice.findFirst({
      where: { organizationId: org.id, status: 'PAID' },
    });
    const hasActiveSubscription = await prisma.subscription.findFirst({
      where: { organizationId: org.id, status: 'ACTIVE' },
    });

    if (!hasPaidInvoice && !hasActiveSubscription && org.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Payment required: Live API keys are only provisioned after verified payment.' },
        { status: 402 }
      );
    }

    const body = await req.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const planConfig = SUBSCRIPTION_PLANS[org.tier as PlanKey] || SUBSCRIPTION_PLANS.DEVELOPER;
    const { token, keyPrefix, keyHash } = generateApiToken();

    const newKey = await prisma.apiKey.create({
      data: {
        keyPrefix,
        keyHash,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        scopes: [...planConfig.scopes],
        allowSensitiveFields: planConfig.allowSensitiveFields,
        rateLimit: planConfig.rateLimitPerMinute,
        isActive: true,
        createdByUserId: user.id,
        organizationId: org.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'New API Key generated successfully. Save this full token securely; it will not be shown again.',
        apiKey: {
          id: newKey.id,
          token,
          keyPrefix: newKey.keyPrefix,
          name: newKey.name,
          scopes: newKey.scopes,
          rateLimit: newKey.rateLimit,
          createdAt: newKey.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Portal Keys] Error creating key:', err);
    return NextResponse.json({ error: 'Failed to generate key', details: err?.message }, { status: 500 });
  }
}
