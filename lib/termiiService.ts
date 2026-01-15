import ProductionLogger from './productionLogger';

interface VerificationData {
  code: string;
  phoneNumber: string;
  timestamp: number;
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
    
    // Debug logging for configuration
    ProductionLogger.debug('Termii service initialized', {
      hasApiKey: !!this.apiKey,
      senderId: this.senderId,
      baseUrl: this.baseUrl
    });
  }

  /**
   * Send OTP via Termii SMS
   * @param {string} phoneNumber - Phone number in international format
   * @returns {Promise<Object>} - Verification result
   */
  async sendVerificationCode(phoneNumber: string) {
    try {
      if (!this.apiKey) {
        throw new Error('Termii API key not configured');
      }

      ProductionLogger.debug('Sending SMS via Termii', { 
        phoneNumber: phoneNumber.slice(-4),
        fullNumber: phoneNumber,
        senderId: this.senderId
      });

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Your CCSA verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

      const payload = {
        to: phoneNumber,
        from: this.senderId,
        sms: message,
        type: "plain",
        api_key: this.apiKey,
        channel: "generic"
      };

      ProductionLogger.debug('Termii SMS payload', { 
        to: phoneNumber,
        from: this.senderId,
        messageLength: message.length,
        hasApiKey: !!this.apiKey,
        fullPayload: payload
      });

      const response = await fetch(`${this.baseUrl}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      ProductionLogger.debug('Termii API response status', { 
        status: response.status,
        statusText: response.statusText 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        ProductionLogger.error('Termii SMS error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData,
          phoneNumber: phoneNumber,
          requestPayload: payload
        });
        throw new Error(`Termii API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      
      ProductionLogger.debug('Termii API full response', { 
        result: result,
        phoneNumber: phoneNumber
      });
      
      if (result.code !== 'ok') {
        ProductionLogger.error('Termii SMS failed', { result });
        throw new Error(result.message || 'Failed to send SMS via Termii');
      }

      // Store the code for verification (expires in 10 minutes)
      const verificationId = `termii_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.verificationCodes.set(verificationId, {
        code,
        phoneNumber,
        timestamp: Date.now(),
      });

      // Clean up old codes
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
   * @returns {Promise<boolean>} - Whether the code is valid
   */
  async verifyCode(verificationId: string, code: string) {
    const data = this.verificationCodes.get(verificationId);
    
    if (!data) {
      ProductionLogger.warn('Verification ID not found', { verificationId });
      return false;
    }

    // Check expiration (10 minutes)
    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      this.verificationCodes.delete(verificationId);
      ProductionLogger.warn('Verification code expired', { verificationId });
      return false;
    }

    if (data.code === code) {
      this.verificationCodes.delete(verificationId);
      return true;
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
}

export default TermiiService;
