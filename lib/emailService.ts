import { Resend } from 'resend';

// Create email client (lazy initialization)
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured');
    return null;
  }
  
  return new Resend(process.env.RESEND_API_KEY);
}

const getFromAddress = () => process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function sendPasswordResetEmail(email: string, resetToken: string, displayName: string) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error('Email service not configured');
  }
  
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
  
  const fromAddress = getFromAddress();
  const subject = 'Reset Your CCSA Admin Password';
  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #013358; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #013358; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CCSA Admin</h1>
              <p>Farmers Information Management System</p>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${displayName || 'User'},</p>
              <p>We received a request to reset your password for your CCSA Admin account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
                ${resetUrl}
              </p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>Centre for Climate Smart Agriculture<br>
              Cosmopolitan University Abuja</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

  const text = `
      Password Reset Request
      
      Hello ${displayName || 'User'},
      
      We received a request to reset your password for your CCSA Admin account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email.
      
      Centre for Climate Smart Agriculture
      Cosmopolitan University Abuja
    `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error(error.message);
    }
    
    console.log('Password reset email sent:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// ─── Agent status email helpers ────────────────────────────────────────────

interface StatusContent {
  subject: string;
  accentColor: string;
  statusLabel: string;
  headline: string;
  intro: string;
  bodyHtml: string;
  showLoginButton: boolean;
}

function getStatusContent(name: string, status: string): StatusContent {
  const loginUrl = `${process.env.NEXTAUTH_URL || 'https://fims.ccsa.edu.ng'}/login`;
  const n = name || 'Applicant';

  switch (status) {
    case 'Applied':
      return {
        subject: 'We received your Field Agent application — CCSA',
        accentColor: '#0052CC',
        statusLabel: 'Application Received',
        headline: 'Thank you for applying!',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>We have successfully received your application to join the CCSA Field Agent programme. Our recruitment team will review your details and get back to you shortly.</p>
          <p>Here is what to expect next:</p>
          <ol style="padding-left:18px;color:#444;">
            <li style="margin-bottom:6px;">Application review by the recruitment panel</li>
            <li style="margin-bottom:6px;">Interview invitation (if shortlisted)</li>
            <li style="margin-bottom:6px;">Onboarding and account activation</li>
          </ol>
          <p>Please keep an eye on this email address for further updates. If you have any questions, contact us at <a href="mailto:agents@ccsa.edu.ng" style="color:#0052CC;">agents@ccsa.edu.ng</a>.</p>`,
        showLoginButton: false,
      };

    case 'CallForInterview':
      return {
        subject: 'Interview Invitation — CCSA Field Agent Programme',
        accentColor: '#FF8B00',
        statusLabel: 'Interview Scheduled',
        headline: 'Congratulations — you have been shortlisted!',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>We are pleased to inform you that your application has been reviewed and you have been shortlisted for an interview as part of the CCSA Field Agent recruitment process.</p>
          <p>Our team will reach out to you shortly with the interview schedule. Please ensure:</p>
          <ul style="padding-left:18px;color:#444;">
            <li style="margin-bottom:6px;">Your phone number is reachable</li>
            <li style="margin-bottom:6px;">You have your NIN and any relevant identification documents ready</li>
            <li style="margin-bottom:6px;">You check this email for the confirmed time and venue</li>
          </ul>
          <p>We look forward to speaking with you.</p>`,
        showLoginButton: false,
      };

    case 'Accepted':
      return {
        subject: 'Application Accepted — Welcome to the CCSA Field Agent Programme',
        accentColor: '#006644',
        statusLabel: 'Application Accepted',
        headline: 'Your application has been accepted!',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>We are delighted to inform you that your application to join the CCSA Field Agent Programme has been <strong>accepted</strong>. Welcome aboard!</p>
          <p>Your account is currently being set up. Once activated, you will receive a separate email with your login credentials for the CCSA Mobile application.</p>
          <p><strong>What happens next:</strong></p>
          <ul style="padding-left:18px;color:#444;">
            <li style="margin-bottom:6px;">Account activation and credential delivery</li>
            <li style="margin-bottom:6px;">Onboarding briefing and training schedule</li>
            <li style="margin-bottom:6px;">Assignment to your state and LGA</li>
          </ul>`,
        showLoginButton: false,
      };

    case 'Enrolled':
    case 'active':
      return {
        subject: 'Your CCSA Field Agent Account is Now Active',
        accentColor: '#00875A',
        statusLabel: 'Account Activated',
        headline: 'Your account is live — start enrolling!',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>Your CCSA Field Agent account has been <strong>activated</strong>. You can now log in to the CCSA Mobile application and begin enrolling farmers in your assigned area.</p>
          <p><strong>Getting started:</strong></p>
          <ol style="padding-left:18px;color:#444;">
            <li style="margin-bottom:6px;">Download the CCSA Mobile app (if not already installed)</li>
            <li style="margin-bottom:6px;">Log in using your registered email and password</li>
            <li style="margin-bottom:6px;">Follow your supervisor's instructions for your first assignment</li>
          </ol>
          <p>If you have not yet received your login password, please contact <a href="mailto:agents@ccsa.edu.ng" style="color:#00875A;">agents@ccsa.edu.ng</a>.</p>`,
        showLoginButton: true,
      };

    case 'Rejected':
      return {
        subject: 'CCSA Field Agent Application — Update',
        accentColor: '#BF2600',
        statusLabel: 'Application Unsuccessful',
        headline: 'Thank you for your interest',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>After careful review of all applications, we regret to inform you that your application for the CCSA Field Agent Programme has not been successful at this time.</p>
          <p>This decision is not a reflection of your personal qualities. We receive a large number of applications and the selection process is highly competitive.</p>
          <p>We encourage you to:</p>
          <ul style="padding-left:18px;color:#444;">
            <li style="margin-bottom:6px;">Check back for future recruitment opportunities on our website</li>
            <li style="margin-bottom:6px;">Contact <a href="mailto:agents@ccsa.edu.ng" style="color:#BF2600;">agents@ccsa.edu.ng</a> if you would like feedback on your application</li>
          </ul>
          <p>Thank you sincerely for your time and interest in the CCSA programme.</p>`,
        showLoginButton: false,
      };

    case 'inactive':
    case 'Inactive':
      return {
        subject: 'Your CCSA Field Agent Account has been Deactivated',
        accentColor: '#6B7280',
        statusLabel: 'Account Deactivated',
        headline: 'Account deactivation notice',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>Your CCSA Field Agent account has been <strong>deactivated</strong>. You will no longer be able to log in to the CCSA Mobile application until your account is reactivated.</p>
          <p>If you believe this is an error or would like more information, please contact your supervisor or reach us at <a href="mailto:agents@ccsa.edu.ng" style="color:#6B7280;">agents@ccsa.edu.ng</a>.</p>`,
        showLoginButton: false,
      };

    default:
      return {
        subject: `CCSA Field Agent — Status Update: ${status}`,
        accentColor: '#013358',
        statusLabel: status,
        headline: 'Your application status has been updated',
        intro: `Dear ${n},`,
        bodyHtml: `<p>Your agent application status has been updated to <strong>${status}</strong>. Please log in to the admin portal for further details.</p>`,
        showLoginButton: true,
      };
  }
}

export async function sendAgentStatusEmail(email: string, name: string, status: string) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Email service not configured - skipping agent status email');
    return null;
  }

  const c = getStatusContent(name, status);
  const loginUrl = `${process.env.NEXTAUTH_URL || 'https://fims.ccsa.edu.ng'}/login`;
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.subject}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo bar -->
        <tr>
          <td style="background:#013358;padding:20px 32px;border-radius:8px 8px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">CCSA</span>
                <span style="font-size:13px;color:#93C5FD;margin-left:8px;">Field Agent Programme</span>
              </td>
              <td align="right">
                <span style="display:inline-block;background:${c.accentColor};color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">${c.statusLabel.toUpperCase()}</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Accent strip -->
        <tr><td style="background:${c.accentColor};height:4px;"></td></tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 32px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${c.headline}</h2>
            <p style="margin:0 0 24px;font-size:14px;color:${c.accentColor};font-weight:600;">${c.statusLabel}</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">${c.intro}</p>
            <div style="font-size:15px;color:#374151;line-height:1.7;">${c.bodyHtml}</div>
            ${c.showLoginButton ? `
            <div style="margin:32px 0 0;text-align:center;">
              <a href="${loginUrl}" style="display:inline-block;background:${c.accentColor};color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 32px;border-radius:6px;letter-spacing:0.3px;">Open CCSA App</a>
            </div>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;border-radius:0 0 8px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#9CA3AF;">
                Centre for Climate Smart Agriculture &mdash; Cosmopolitan University Abuja<br>
                &copy; ${year} CCSA. All rights reserved.
              </td>
              <td align="right" style="font-size:12px;color:#9CA3AF;">
                This is an automated message &mdash; do not reply.
              </td>
            </tr></table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${c.statusLabel}\n\n${c.intro}\n\n${c.bodyHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}\n\n---\nCentre for Climate Smart Agriculture, Cosmopolitan University Abuja`;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject: c.subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending agent status email:', error);
      return null;
    }

    console.log(`Agent status email sent [${status}]:`, data?.id);
    return data;
  } catch (error) {
    console.error('Error sending agent status email:', error);
    return null; // never block the main status-update flow
  }
}

export async function sendApiAccessRequestNotification(params: {
  organizationName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  intendedUse: string;
  requestedScopes: string[];
  expectedVolume?: string | null;
  requestId: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Email service not configured - skipping API access request notification');
    return null;
  }

  const adminEmail = 'abdulrahman.dauda@cosmopolitan.edu.ng';
  const reviewUrl = `${process.env.NEXTAUTH_URL}/api-keys/access-requests`;

  const fromAddress = getFromAddress();
  const subject = `New API Access Request — ${params.organizationName}`;
  const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New API Access Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #013358; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .field { margin-bottom: 12px; }
            .label { font-weight: bold; color: #013358; }
            .value { background-color: #fff; padding: 8px 12px; border-left: 3px solid #013358; margin-top: 4px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #013358; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CCSA FIMS</h1>
              <p>New API Access Request Received</p>
            </div>
            <div class="content">
              <p>A new organisation has submitted an API access request. Please review and respond via the admin dashboard.</p>
              <div class="field">
                <div class="label">Organisation Name</div>
                <div class="value">${params.organizationName}</div>
              </div>
              <div class="field">
                <div class="label">Contact Name</div>
                <div class="value">${params.contactName}</div>
              </div>
              <div class="field">
                <div class="label">Email</div>
                <div class="value">${params.email}</div>
              </div>
              ${params.phone ? `<div class="field"><div class="label">Phone</div><div class="value">${params.phone}</div></div>` : ''}
              <div class="field">
                <div class="label">Intended Use</div>
                <div class="value">${params.intendedUse}</div>
              </div>
              <div class="field">
                <div class="label">Requested Scopes</div>
                <div class="value">${params.requestedScopes.join(', ')}</div>
              </div>
              ${params.expectedVolume ? `<div class="field"><div class="label">Expected Volume</div><div class="value">${params.expectedVolume}</div></div>` : ''}
              <div class="field">
                <div class="label">Request ID</div>
                <div class="value" style="font-family: monospace; font-size: 12px;">${params.requestId}</div>
              </div>
              <p style="text-align: center;">
                <a href="${reviewUrl}" class="button">Review in Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>Centre for Climate Smart Agriculture<br>Cosmopolitan University Abuja</p>
              <p>This is an automated notification from FIMS.</p>
            </div>
          </div>
        </body>
      </html>
    `;

  const text = `
New API Access Request — ${params.organizationName}

Organisation: ${params.organizationName}
Contact: ${params.contactName}
Email: ${params.email}
${params.phone ? `Phone: ${params.phone}\n` : ''}Intended Use: ${params.intendedUse}
Requested Scopes: ${params.requestedScopes.join(', ')}
${params.expectedVolume ? `Expected Volume: ${params.expectedVolume}\n` : ''}Request ID: ${params.requestId}

Review: ${reviewUrl}

Centre for Climate Smart Agriculture
Cosmopolitan University Abuja
    `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [adminEmail],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending API access request notification:', error);
      return null;
    }

    console.log('API access request notification sent:', data?.id);
    return data;
  } catch (error) {
    console.error('Error sending API access request notification:', error);
    return null;
  }
}

/**
 * Send a custom admin-composed message to a farmer or agent.
 * Returns { success, messageId?, error? }
 */
export async function sendCustomEmail(
  to: string,
  name: string,
  subject: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const year = new Date().getFullYear();
  // Convert newlines to <br> for HTML rendering
  const bodyHtml = body.replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#013358;padding:20px 32px;border-radius:8px 8px 0 0;">
            <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">CCSA</span>
            <span style="font-size:13px;color:#93C5FD;margin-left:8px;">Farmers Information Management System</span>
          </td>
        </tr>
        <!-- Accent strip -->
        <tr><td style="background:#16A34A;height:4px;"></td></tr>
        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:36px 32px;">
            <p style="margin:0 0 12px;font-size:15px;color:#374151;">Dear ${name || 'Valued Member'},</p>
            <div style="font-size:15px;color:#374151;line-height:1.7;">${bodyHtml}</div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;border-radius:0 0 8px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:12px;color:#9CA3AF;">
                Centre for Climate Smart Agriculture &mdash; Cosmopolitan University Abuja<br>
                &copy; ${year} CCSA. All rights reserved.
              </td>
              <td align="right" style="font-size:12px;color:#9CA3AF;">
                This is an official message from CCSA admin.
              </td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject,
      html,
      text: `Dear ${name || 'Valued Member'},\n\n${body}\n\n---\nCentre for Climate Smart Agriculture, Cosmopolitan University Abuja`,
    });

    if (error) {
      console.error('Error sending custom email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    console.error('Error sending custom email:', error);
    return { success: false, error: error.message };
  }
}
