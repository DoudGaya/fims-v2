import ProductionLogger from './productionLogger';
import redis from './redis';

interface VerificationData {
  code: string;
  phoneNumber: string;
  timestamp: number;
  verificationId?: string;
}

class TermiiService {
  private apiKey: string | undefined;
  private senderId: string;
  private baseUrl: string;
  private verificationCodes: Map<string, VerificationData>;

  constructor() {
    this.apiKey = process.env.TERMII_API_KEY;
    this.senderId = process.env.TERMII_SENDER_ID || 'CCSA';
    this.baseUrl = process.env.TERMII_BASE_URL || 'https://v3.api.termii.com';

    // Use a global map to persist codes across instances in the same process
    if (!(global as any).termiiVerificationCodes) {
      (global as any).termiiVerificationCodes = new Map<string, VerificationData>();
    }
    this.verificationCodes = (global as any).termiiVerificationCodes;

    ProductionLogger.debug('Termii service initialized', {
      hasApiKey: !!this.apiKey,
      senderId: this.senderId,
      baseUrl: this.baseUrl
    });
  }

  /**
   * Send OTP via Termii SMS
   * @param {string} phoneNumber - Phone number in international format (+234...)
   * @returns {Promise<Object>} - Verification result
   */
  async sendVerificationCode(phoneNumber: string) {
    try {
      if (!this.apiKey) {
        throw new Error('Termii API key not configured');
      }

      ProductionLogger.debug('Sending SMS OTP via Termii', {
        phoneNumber: phoneNumber.slice(-4),
        fullNumber: phoneNumber,
        senderId: this.senderId
      });

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Your CCSA verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

      // Normalise phone number to 234... without leading +
      let normalisedTo = phoneNumber.trim().replace(/\s+/g, '');
      if (normalisedTo.startsWith('+')) {
        normalisedTo = normalisedTo.slice(1);
      } else if (normalisedTo.startsWith('0') && normalisedTo.length === 11) {
        normalisedTo = '234' + normalisedTo.slice(1);
      }

      let sentSuccessfully = false;
      let lastError: any = null;

      // Try generic first, fallback to dnd channel if generic is blocked or fails
      for (const channel of ['generic', 'dnd'] as const) {
        try {
          const payload = {
            to: normalisedTo,
            from: this.senderId,
            sms: message,
            type: "plain",
            api_key: this.apiKey,
            channel
          };

          const response = await fetch(`${this.baseUrl}/api/sms/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json().catch(() => ({}));
            if (result.code === 'ok' || result.message?.toLowerCase().includes('successfully') || result.message_id) {
              sentSuccessfully = true;
              break;
            } else {
              lastError = new Error(result.message || `Termii returned status code: ${result.code}`);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            lastError = new Error(`Termii error ${response.status}: ${JSON.stringify(errorData)}`);
          }
        } catch (err: any) {
          lastError = err;
        }
      }

      if (!sentSuccessfully && lastError) {
        ProductionLogger.error('Termii SMS OTP delivery failed across all channels', { error: lastError.message, to: normalisedTo });
        throw lastError;
      }

      // Store the code for verification (expires in 10 minutes = 600s)
      const verificationId = `termii_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const verificationPayload: VerificationData = {
        code,
        phoneNumber,
        timestamp: Date.now(),
        verificationId,
      };

      // 1. In-memory Map
      this.verificationCodes.set(verificationId, verificationPayload);

      // 2. Redis persistent store
      try {
        await redis.set(`otp:id:${verificationId}`, JSON.stringify(verificationPayload), { ex: 600 });
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        await redis.set(`otp:phone:${cleanPhone}`, JSON.stringify(verificationPayload), { ex: 600 });
      } catch (redisErr) {
        ProductionLogger.warn('Redis unavailable for OTP, memory Map active:', redisErr);
      }

      this.cleanupOldCodes();

      return {
        success: true,
        service: 'termii',
        verificationId,
        status: 'pending'
      };

    } catch (error: any) {
      ProductionLogger.error('Termii send error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify a code sent via Termii
   * @param {string} verificationId - The ID returned from sendVerificationCode
   * @param {string} code - The code entered by the user
   * @param {string} [phoneNumber] - Optional phone number for fallback lookup
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async verifyCode(verificationId: string, code: string, phoneNumber?: string): Promise<boolean> {
    const cleanCode = code?.trim();
    if (!cleanCode) return false;

    // 1. Check Redis by verificationId
    if (verificationId) {
      try {
        const cached = await redis.get<string | VerificationData>(`otp:id:${verificationId}`);
        if (cached) {
          const data: VerificationData = typeof cached === 'string' ? JSON.parse(cached) : cached;
          if (data && data.code === cleanCode) {
            await redis.del(`otp:id:${verificationId}`).catch(() => null);
            if (phoneNumber) {
              await redis.del(`otp:phone:${phoneNumber.replace(/\D/g, '')}`).catch(() => null);
            }
            this.verificationCodes.delete(verificationId);
            return true;
          }
        }
      } catch (err) {
        ProductionLogger.warn('Redis error in verifyCode:', err);
      }
    }

    // 2. Check Redis by phone number (if verificationId was lost or mismatched)
    if (phoneNumber) {
      try {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const cached = await redis.get<string | VerificationData>(`otp:phone:${cleanPhone}`);
        if (cached) {
          const data: VerificationData = typeof cached === 'string' ? JSON.parse(cached) : cached;
          if (data && data.code === cleanCode) {
            await redis.del(`otp:phone:${cleanPhone}`).catch(() => null);
            if (data.verificationId) {
              await redis.del(`otp:id:${data.verificationId}`).catch(() => null);
              this.verificationCodes.delete(data.verificationId);
            }
            return true;
          }
        }
      } catch (err) {
        ProductionLogger.warn('Redis error by phone in verifyCode:', err);
      }
    }

    // 3. Fallback to in-memory Map by verificationId
    if (verificationId) {
      const data = this.verificationCodes.get(verificationId);
      if (data) {
        if (Date.now() - data.timestamp > 10 * 60 * 1000) {
          this.verificationCodes.delete(verificationId);
          return false;
        }
        if (data.code === cleanCode) {
          this.verificationCodes.delete(verificationId);
          return true;
        }
      }
    }

    // 4. Fallback to in-memory Map by phone number
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      for (const [vId, data] of this.verificationCodes.entries()) {
        if (data.phoneNumber.replace(/\D/g, '') === cleanPhone) {
          if (Date.now() - data.timestamp <= 10 * 60 * 1000 && data.code === cleanCode) {
            this.verificationCodes.delete(vId);
            return true;
          }
        }
      }
    }

    return false;
  }

  private cleanupOldCodes() {
    const now = Date.now();
    for (const [id, data] of this.verificationCodes.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) {
        this.verificationCodes.delete(id);
      }
    }
  }

  /**
   * Send a plain SMS notification message to a phone number.
   * @param phoneNumber - Phone number (Nigerian format accepted)
   * @param message - SMS body text
   */
  async sendMessage(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'Termii API key not configured' };
      }

      // Normalise to 234 format without +
      let normalised = phoneNumber.trim().replace(/\s+/g, '');
      if (normalised.startsWith('0') && normalised.length === 11) {
        normalised = '234' + normalised.slice(1);
      } else if (normalised.startsWith('+234')) {
        normalised = normalised.slice(1);
      } else if (!normalised.startsWith('234')) {
        normalised = '234' + normalised.replace(/^0+/, '');
      }

      for (const channel of ['generic', 'dnd'] as const) {
        try {
          const payload = {
            to: normalised,
            from: this.senderId,
            sms: message,
            type: 'plain',
            api_key: this.apiKey,
            channel,
          };

          const response = await fetch(`${this.baseUrl}/api/sms/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const result = await response.json().catch(() => ({}));
            if (result.code === 'ok' || result.message?.toLowerCase().includes('successfully') || result.message_id) {
              return { success: true };
            }
          }
        } catch (err: any) {
          ProductionLogger.warn(`Termii send notification failed on ${channel}:`, err);
        }
      }

      return { success: false, error: 'SMS notification failed delivery' };
    } catch (error: any) {
      ProductionLogger.error('Termii sendMessage error', { error: error.message });
      return { success: false, error: error.message };
    }
  }
}

export default TermiiService;
