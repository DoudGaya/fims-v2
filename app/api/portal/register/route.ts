import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateApiToken } from '@/lib/api-key-auth';
import { PaystackService, SUBSCRIPTION_PLANS, PlanKey } from '@/lib/paystack';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Company name is required').max(150),
  rcNumber: z.string().max(50).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email('Valid corporate email is required'),
  contactPhone: z.string().min(8, 'Phone number is required').max(25),
  contactName: z.string().min(2, 'Contact person name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tier: z.enum(['DEVELOPER', 'BUSINESS', 'ENTERPRISE_KYC']).default('DEVELOPER'),
  intendedUse: z.string().min(10, 'Please state your intended use of the data').max(1000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const {
      organizationName,
      rcNumber,
      taxId,
      contactEmail,
      contactPhone,
      contactName,
      password,
      tier,
      intendedUse,
    } = parsed.data;

    // Check if email already registered
    const existingOrg = await prisma.organization.findUnique({
      where: { contactEmail },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this contact email already exists. Please log in to your Client Portal.' },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: contactEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user account with this email already exists. Please use another email or sign in.' },
        { status: 409 }
      );
    }

    const planConfig = SUBSCRIPTION_PLANS[tier as PlanKey] || SUBSCRIPTION_PLANS.DEVELOPER;
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const billingCycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Generate initial live API token
    const { token, keyPrefix, keyHash } = generateApiToken();
    const reference = `fims_inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const invoiceNumber = `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create User, Organization, OrganizationUser, ApiKey, and initial Invoice in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email: contactEmail,
          displayName: contactName,
          password: hashedPassword,
          role: 'client',
          phoneNumber: contactPhone,
          isActive: true,
          isVerified: true,
        },
      });

      // 2. Create Organization
      const org = await tx.organization.create({
        data: {
          name: organizationName,
          rcNumber: rcNumber ?? null,
          taxId: taxId ?? null,
          contactEmail,
          contactPhone,
          tier: tier as any,
          billingCurrency: 'NGN',
          status: 'ACTIVE',
          monthlyQuota: planConfig.monthlyQuota,
          currentUsage: 0,
          billingCycleStart: now,
          billingCycleEnd,
        },
      });

      // 3. Link User to Organization
      await tx.organizationUser.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      // 4. Create Initial ApiKey (inactive until payment is verified)
      await tx.apiKey.create({
        data: {
          keyPrefix,
          keyHash,
          name: `${organizationName} Primary Live Key`,
          description: `Generated during B2B onboarding for ${intendedUse.slice(0, 80)}`,
          scopes: [...planConfig.scopes],
          allowSensitiveFields: planConfig.allowSensitiveFields,
          rateLimit: planConfig.rateLimitPerMinute,
          isActive: false, // Activated upon payment confirmation
          createdByUserId: user.id,
          organizationId: org.id,
        },
      });

      // 5. Create Initial Invoice
      const invoice = await tx.invoice.create({
        data: {
          organizationId: org.id,
          invoiceNumber,
          amount: planConfig.priceNgn,
          currency: 'NGN',
          status: 'PENDING',
          paymentProvider: 'paystack',
          transactionRef: reference,
          dueDate: billingCycleEnd,
          description: `Initial Subscription for ${planConfig.name} Plan (${planConfig.monthlyQuota.toLocaleString()} queries)`,
        },
      });

      return { user, org, invoice };
    });

    // Initialize Paystack payment URL
    let authorizationUrl: string | undefined;
    try {
      const paystackInit = await PaystackService.initializePayment({
        email: contactEmail,
        amountInKobo: planConfig.amountInKobo,
        reference,
        callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/portal/billing/verify?reference=${reference}`,
        metadata: {
          organizationId: result.org.id,
          invoiceId: result.invoice.id,
          planId: tier,
        },
      });
      authorizationUrl = paystackInit.authorizationUrl;
    } catch (paystackErr) {
      console.warn('[Portal Registration] Paystack checkout initialization warning:', paystackErr);
    }

    if (!authorizationUrl) {
      authorizationUrl = `/portal/billing/mock-checkout?reference=${encodeURIComponent(reference)}&amount=${planConfig.amountInKobo}`;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Organization registered successfully. Settle invoice to activate live API credentials.',
        organization: {
          id: result.org.id,
          name: result.org.name,
          tier: result.org.tier,
          monthlyQuota: result.org.monthlyQuota,
          billingCycleEnd: result.org.billingCycleEnd,
        },
        apiKey: {
          status: 'PENDING_PAYMENT',
          message: 'Live API credentials will be provisioned once payment is settled.',
          scopes: planConfig.scopes,
          rateLimit: planConfig.rateLimitPerMinute,
        },
        invoice: {
          invoiceNumber: result.invoice.invoiceNumber,
          amount: planConfig.priceNgn,
          currency: 'NGN',
          reference,
          authorizationUrl,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Portal Register] Error:', err);
    return NextResponse.json(
      { error: 'Onboarding failed', details: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
