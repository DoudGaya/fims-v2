import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { PaystackService, SUBSCRIPTION_PLANS, PlanKey } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!reference) {
    return NextResponse.redirect(`${baseUrl}/portal/dashboard?payment=missing_ref`);
  }

  try {
    const result = await PaystackService.verifyPayment(reference);

    if (result.status && result.data?.status === 'success') {
      const invoice = await prisma.invoice.findFirst({
        where: { transactionRef: reference },
        include: { organization: true },
      });

      if (invoice) {
        if (invoice.status === 'PAID') {
          return NextResponse.redirect(`${baseUrl}/portal/dashboard?payment=already_processed&ref=${encodeURIComponent(reference)}`);
        }

        const now = new Date();
        const cycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const metadata = result.data.metadata || {};
        const planId = (metadata.planId || invoice.organization.tier) as PlanKey;
        const planConfig = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.DEVELOPER;

        // Mark invoice as paid
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidAt: now,
          },
        });

        // Upgrade / extend organization quota
        await prisma.organization.update({
          where: { id: invoice.organizationId },
          data: {
            status: 'ACTIVE',
            tier: planId as any,
            monthlyQuota: planConfig.monthlyQuota,
            currentUsage: 0,
            billingCycleStart: now,
            billingCycleEnd: cycleEnd,
            paystackCustomerCode: result.data.customer?.customer_code || invoice.organization.paystackCustomerCode,
          },
        });

        // Upsert active subscription
        const activeSub = await prisma.subscription.findFirst({
          where: { organizationId: invoice.organizationId },
        });

        if (activeSub) {
          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: {
              tier: planId as any,
              status: 'ACTIVE',
              monthlyQuota: planConfig.monthlyQuota,
              currentUsage: 0,
              billingCycleStart: now,
              billingCycleEnd: cycleEnd,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              organizationId: invoice.organizationId,
              tier: planId as any,
              status: 'ACTIVE',
              monthlyQuota: planConfig.monthlyQuota,
              currentUsage: 0,
              billingCycleStart: now,
              billingCycleEnd: cycleEnd,
            },
          });
        }

        // Reactivate organization API keys
        await prisma.apiKey.updateMany({
          where: { organizationId: invoice.organizationId },
          data: { isActive: true },
        });

        return NextResponse.redirect(`${baseUrl}/portal/dashboard?payment=success&ref=${encodeURIComponent(reference)}`);
      }
    }

    return NextResponse.redirect(`${baseUrl}/portal/dashboard?payment=failed&ref=${encodeURIComponent(reference)}`);
  } catch (err: any) {
    console.error('[Portal Billing Verify] Error:', err);
    return NextResponse.redirect(`${baseUrl}/portal/dashboard?payment=error&message=${encodeURIComponent(err?.message || 'Verification failed')}`);
  }
}
