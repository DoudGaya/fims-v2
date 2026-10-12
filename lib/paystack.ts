import crypto from 'crypto';

export interface PaystackInitializeOptions {
  email: string;
  amountInKobo: number; // e.g. 25000000 kobo = NGN 250,000.00
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaystackVerificationResult {
  status: boolean;
  message: string;
  data?: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    channel: string;
    currency: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    metadata?: Record<string, any>;
  };
}

export const SUBSCRIPTION_PLANS = {
  DEVELOPER: {
    id: 'DEVELOPER',
    name: 'Developer / Pilot',
    description: 'Perfect for agtech developers & early-stage pilot integrations.',
    monthlyQuota: 1500,
    rateLimitPerMinute: 10,
    priceNgn: 250000,
    priceUsd: 200,
    amountInKobo: 25000000,
    scopes: ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read'],
    allowSensitiveFields: false,
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: 'Business Commercial',
    description: 'For agribusinesses, off-takers, and supply chain aggregators.',
    monthlyQuota: 25000,
    rateLimitPerMinute: 120,
    priceNgn: 1800000,
    priceUsd: 1400,
    amountInKobo: 180000000,
    scopes: ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read'],
    allowSensitiveFields: false,
  },
  ENTERPRISE_KYC: {
    id: 'ENTERPRISE_KYC',
    name: 'Enterprise Financial & KYC',
    description: 'For commercial banks, micro-finance lenders, and crop insurance underwriters.',
    monthlyQuota: 100000,
    rateLimitPerMinute: 300,
    priceNgn: 6500000,
    priceUsd: 5000,
    amountInKobo: 650000000,
    scopes: ['farmers:read', 'farms:read', 'clusters:read', 'analytics:read'],
    allowSensitiveFields: true,
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;

export class PaystackService {
  private static getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_paystack_secret_key';
  }

  public static getPublicKey(): string {
    return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_mock_paystack_public_key';
  }

  /**
   * Initialize a payment transaction with Paystack API
   */
  public static async initializePayment(
    options: PaystackInitializeOptions
  ): Promise<{ authorizationUrl?: string; reference: string; accessCode?: string }> {
    const secretKey = this.getSecretKey();

    // If using mock secret key in local dev, provide mock checkout
    if (secretKey.startsWith('sk_test_mock')) {
      return {
        authorizationUrl: `/portal/billing/mock-checkout?reference=${encodeURIComponent(options.reference)}&amount=${options.amountInKobo}`,
        reference: options.reference,
        accessCode: `mock_access_${Date.now()}`,
      };
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: options.email,
          amount: options.amountInKobo,
          reference: options.reference,
          callback_url: options.callbackUrl,
          metadata: options.metadata,
        }),
      });

      const data = await response.json();
      if (!data.status) {
        throw new Error(data.message || 'Failed to initialize Paystack transaction');
      }

      return {
        authorizationUrl: data.data.authorization_url,
        reference: data.data.reference,
        accessCode: data.data.access_code,
      };
    } catch (err: any) {
      console.error('[PaystackService.initializePayment] Error:', err);
      throw err;
    }
  }

  /**
   * Verify transaction status with Paystack API
   */
  public static async verifyPayment(reference: string): Promise<PaystackVerificationResult> {
    const secretKey = this.getSecretKey();

    // Mock verification for local tests
    if (secretKey.startsWith('sk_test_mock')) {
      return {
        status: true,
        message: 'Mock verification successful',
        data: {
          id: 123456,
          domain: 'test',
          status: 'success',
          reference,
          amount: 25000000,
          gateway_response: 'Successful',
          paid_at: new Date().toISOString(),
          channel: 'card',
          currency: 'NGN',
          customer: {
            id: 999,
            email: 'client@example.com',
            customer_code: 'CUS_mock123',
          },
        },
      };
    }

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      return await response.json();
    } catch (err: any) {
      console.error('[PaystackService.verifyPayment] Error:', err);
      return {
        status: false,
        message: err.message || 'Failed to verify transaction with Paystack',
      };
    }
  }

  /**
   * Validate webhook HMAC SHA512 signature sent by Paystack
   */
  public static verifyWebhookSignature(signature: string | null, rawBody: string): boolean {
    if (!signature) return false;
    const secretKey = this.getSecretKey();
    if (secretKey.startsWith('sk_test_mock')) return true;

    try {
      const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
      return hash === signature;
    } catch {
      return false;
    }
  }
}
