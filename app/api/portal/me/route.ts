import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { SUBSCRIPTION_PLANS, PlanKey } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user and their associated organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizationMemberships: {
          include: {
            organization: {
              include: {
                apiKeys: {
                  select: {
                    id: true,
                    keyPrefix: true,
                    name: true,
                    description: true,
                    scopes: true,
                    rateLimit: true,
                    isActive: true,
                    lastUsedAt: true,
                    requestCount: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: 'desc' },
                },
                invoices: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
                subscriptions: {
                  where: { status: 'ACTIVE' },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.organizationMemberships.length === 0) {
      return NextResponse.json(
        { error: 'No commercial organization found for this account.' },
        { status: 404 }
      );
    }

    const membership = user.organizationMemberships[0];
    const org = membership.organization;
    const planInfo = SUBSCRIPTION_PLANS[org.tier as PlanKey] || SUBSCRIPTION_PLANS.DEVELOPER;

    const hasPaidInvoice = org.invoices.some((inv) => inv.status === 'PAID');
    const hasActiveSubscription = org.subscriptions.length > 0;
    const isPaidAccount = hasPaidInvoice || hasActiveSubscription;
    const pendingInvoice = org.invoices.find((inv) => inv.status === 'PENDING') || null;

    // Serialize BigInt requestCounts for JSON and mark locked state
    const serializedKeys = org.apiKeys.map((k) => ({
      ...k,
      requestCount: Number(k.requestCount),
      isLocked: !isPaidAccount && !k.isActive,
    }));

    // Calculate days remaining in billing cycle
    const now = new Date();
    const cycleEnd = org.billingCycleEnd ? new Date(org.billingCycleEnd) : null;
    const daysRemaining = cycleEnd
      ? Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName,
        role: membership.role,
      },
      organization: {
        id: org.id,
        name: org.name,
        rcNumber: org.rcNumber,
        taxId: org.taxId,
        contactEmail: org.contactEmail,
        tier: org.tier,
        planName: planInfo.name,
        monthlyQuota: org.monthlyQuota,
        currentUsage: org.currentUsage,
        usagePercentage: org.monthlyQuota > 0 ? Math.min(100, Math.round((org.currentUsage / org.monthlyQuota) * 100)) : 0,
        daysRemaining,
        status: org.status,
        isPaid: isPaidAccount,
        pendingInvoice: pendingInvoice ? {
          id: pendingInvoice.id,
          invoiceNumber: pendingInvoice.invoiceNumber,
          amount: pendingInvoice.amount,
          transactionRef: pendingInvoice.transactionRef,
        } : null,
        billingCurrency: org.billingCurrency,
        billingCycleStart: org.billingCycleStart,
        billingCycleEnd: org.billingCycleEnd,
      },
      apiKeys: serializedKeys,
      invoices: org.invoices,
      availablePlans: SUBSCRIPTION_PLANS,
    });
  } catch (err: any) {
    console.error('[Portal Me] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch organization details', details: err?.message },
      { status: 500 }
    );
  }
}
