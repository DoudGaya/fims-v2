import { auth as firebaseAuth } from '@/lib/firebase-admin';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import ProductionLogger from '@/lib/productionLogger';
import TermiiService from '@/lib/termiiService';
import { sendAgentStatusEmail } from '@/lib/emailService';

export interface ProvisionAgentParams {
  userId: string;
  email: string;
  phone?: string | null;
  displayName?: string | null;
  password?: string;
  statusLabel?: string;
  sendNotifications?: boolean;
}

export interface ProvisionResult {
  success: boolean;
  firebaseUid?: string;
  password?: string;
  smsSent?: boolean;
  emailSent?: boolean;
  error?: string;
}

/**
 * Provisions or synchronizes an agent's Firebase Auth account and DB credentials,
 * then dispatches credentials via SMS (Termii) and Email (Resend).
 */
export async function provisionAgentAccount(params: ProvisionAgentParams): Promise<ProvisionResult> {
  const {
    userId,
    email,
    phone,
    displayName,
    password = '1234567890',
    statusLabel = 'Enrolled',
    sendNotifications = true,
  } = params;

  const normalizedEmail = email.trim().toLowerCase();
  let firebaseUid: string | undefined;

  try {
    // 1. Firebase Auth user create or update
    try {
      const existingFbUser = await firebaseAuth.getUserByEmail(normalizedEmail);
      firebaseUid = existingFbUser.uid;
      await firebaseAuth.updateUser(existingFbUser.uid, {
        password,
        displayName: displayName || existingFbUser.displayName || 'Agent',
        disabled: false,
      });
      ProductionLogger.info(`Updated existing Firebase user password for ${normalizedEmail}`, { uid: firebaseUid });
    } catch (fbError: any) {
      if (fbError.code === 'auth/user-not-found') {
        const newFbUser = await firebaseAuth.createUser({
          email: normalizedEmail,
          password,
          displayName: displayName || 'Agent',
          emailVerified: true,
          disabled: false,
        });
        firebaseUid = newFbUser.uid;
        ProductionLogger.info(`Created new Firebase user for ${normalizedEmail}`, { uid: firebaseUid });
      } else {
        throw fbError;
      }
    }

    // 2. Hash password & update Prisma User
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        firebaseUid,
        isActive: true,
      },
    });

    let smsSent = false;
    let emailSent = false;

    // 3. Dispatch notifications if requested
    if (sendNotifications) {
      // A. Send SMS via Termii
      if (phone) {
        try {
          const termii = new TermiiService();
          const cleanPhone = phone.trim();
          const smsText = `Welcome to CCSA FIMS! Your agent account is now active. Email: ${normalizedEmail}, Password: ${password}. Log in on the CCSA mobile app to start.`;
          const smsResult = await termii.sendMessage(cleanPhone, smsText);
          smsSent = !!smsResult.success;
          ProductionLogger.info(`Agent activation SMS sent to ${cleanPhone}: ${smsSent}`);
        } catch (smsErr: any) {
          ProductionLogger.warn(`Failed to send activation SMS to ${phone}:`, smsErr?.message);
        }
      }

      // B. Send Email via Resend
      try {
        await sendAgentStatusEmail(
          normalizedEmail,
          displayName || 'Agent',
          statusLabel,
          password
        );
        emailSent = true;
        ProductionLogger.info(`Agent activation email sent to ${normalizedEmail}`);
      } catch (emailErr: any) {
        ProductionLogger.warn(`Failed to send activation email to ${normalizedEmail}:`, emailErr?.message);
      }
    }

    return {
      success: true,
      firebaseUid,
      password,
      smsSent,
      emailSent,
    };
  } catch (error: any) {
    ProductionLogger.error(`Error provisioning agent account for ${normalizedEmail}:`, error);
    return {
      success: false,
      error: error?.message || 'Failed to provision agent account',
    };
  }
}

