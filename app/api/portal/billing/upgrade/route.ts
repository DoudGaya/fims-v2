import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { PaystackService, SUBSCRIPTION_PLANS, PlanKey } from '@/lib/paystack';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const upgradeSchema = z.object({
  targetTier: z.enum(['DEVELOPER', 'BUSINESS', 'ENTERPRISE_KYC']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = upgradeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid tier specified' }, { status: 422 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { organizationMemberships: { include: { organization: true } } },
    });

    if (!user || user.organizationMemberships.length === 0) {
      return NextResponse.json({ error: 'No associated organization found' }, { status: 404 });
    }

    const org = user.organizationMemberships[0].organization;
    const plan = SUBSCRIPTION_PLANS[parsed.data.targetTier as PlanKey];
    const now = new Date();
    const reference = `fims_upg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Invoice
    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        invoiceNumber,
        amount: plan.priceNgn,
        currency: 'NGN',
        status: 'PENDING',
        paymentProvider: 'paystack',
        transactionRef: reference,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        description: `Upgrade / Renewal to ${plan.name} (${plan.monthlyQuota.toLocaleString()} queries/month)`,
      },
    });

    // Initialize Paystack checkout with fallback to mock sandbox
    let authorizationUrl: string;
    try {
      const checkout = await PaystackService.initializePayment({
        email: org.contactEmail,
        amountInKobo: plan.amountInKobo,
        reference,
        callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/billing/verify?reference=${reference}`,
        metadata: {
          organizationId: org.id,
          invoiceId: invoice.id,
          planId: parsed.data.targetTier,
        },
      });
      authorizationUrl = checkout.authorizationUrl || `/portal/billing/mock-checkout?reference=${encodeURIComponent(reference)}&amount=${plan.amountInKobo}`;
    } catch (paystackErr) {
      console.warn('[Portal Upgrade] Paystack checkout fallback to sandbox:', paystackErr);
      authorizationUrl = `/portal/billing/mock-checkout?reference=${encodeURIComponent(reference)}&amount=${plan.amountInKobo}`;
    }

    return NextResponse.json({
      success: true,
      authorizationUrl,
      reference,
      invoiceNumber,
      amount: plan.priceNgn,
      currency: 'NGN',
    });
  } catch (err: any) {
    console.error('[Portal Billing Upgrade] Error:', err);
    return NextResponse.json({ error: 'Failed to initiate checkout', details: err?.message }, { status: 500 });
  }
}
