import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PaystackService, SUBSCRIPTION_PLANS, PlanKey } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!PaystackService.verifyWebhookSignature(signature, rawBody)) {
      console.warn('[Paystack Webhook] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log(`[Paystack Webhook] Event received: ${event.event}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;
      const metadata = data.metadata || {};
      const planId = (metadata.planId || 'DEVELOPER') as PlanKey;
      const selectedPlan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.DEVELOPER;

      // Find pending invoice by reference
      const invoice = await prisma.invoice.findFirst({
        where: { transactionRef: reference },
        include: { organization: true },
      });

      const now = new Date();
      const billingCycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      if (invoice) {
        // Mark invoice as paid
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidAt: now,
          },
        });

        // Renew / upgrade organization
        await prisma.organization.update({
          where: { id: invoice.organizationId },
          data: {
            status: 'ACTIVE',
            tier: planId as any,
            monthlyQuota: selectedPlan.monthlyQuota,
            currentUsage: 0,
            billingCycleStart: now,
            billingCycleEnd,
            paystackCustomerCode: data.customer?.customer_code || invoice.organization.paystackCustomerCode,
          },
        });

        // Upsert subscription record
        const activeSub = await prisma.subscription.findFirst({
          where: { organizationId: invoice.organizationId },
        });

        if (activeSub) {
          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: {
              tier: planId as any,
              status: 'ACTIVE',
              monthlyQuota: selectedPlan.monthlyQuota,
              currentUsage: 0,
              billingCycleStart: now,
              billingCycleEnd,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              organizationId: invoice.organizationId,
              tier: planId as any,
              status: 'ACTIVE',
              monthlyQuota: selectedPlan.monthlyQuota,
              currentUsage: 0,
              billingCycleStart: now,
              billingCycleEnd,
            },
          });
        }

        // Reactivate any suspended organization API keys
        await prisma.apiKey.updateMany({
          where: { organizationId: invoice.organizationId },
          data: { isActive: true },
        });

        console.log(`[Paystack Webhook] Successfully processed payment for org ${invoice.organization.name}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Paystack Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed', details: err?.message }, { status: 500 });
  }
}
