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
            .header { background-color: #013358; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { border-radius: 50%; margin-bottom: 10px; background-color: white; padding: 4px; }
            .content { padding: 30px; background-color: #ffffff; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; }
            body { background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
            
            .button { display: inline-block; padding: 12px 24px; background-color: #013358; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${process.env.NEXTAUTH_URL}/favicon.ico" alt="CCSA Logo" width="56" height="56" />
              <h1 style="margin: 0; font-size: 24px;">CCSA Admin</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">Farmers Information Management System</p>
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

function getStatusContent(name: string, status: string, tempPassword?: string): StatusContent {
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
      let passwordInfo = '';
      if (tempPassword) {
        passwordInfo = `<p style="background-color:#E6F4EA; border-left: 4px solid #00875A; padding: 12px; border-radius: 4px;"><strong>Your initial login password is:</strong> <code style="font-size: 16px; background: transparent; padding: 0;">${tempPassword}</code><br><em>Please change this password after your first login for security purposes.</em></p>`;
      }

      return {
        subject: 'Your CCSA Field Agent Account is Now Active',
        accentColor: '#00875A',
        statusLabel: 'Account Activated',
        headline: 'Your account is live — start enrolling!',
        intro: `Dear ${n},`,
        bodyHtml: `
          <p>Your CCSA Field Agent account has been <strong>activated</strong>. You can now log in to the CCSA Mobile application and begin enrolling farmers in your assigned area.</p>
          ${passwordInfo}
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

export async function sendAgentStatusEmail(email: string, name: string, status: string, tempPassword?: string) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Email service not configured - skipping agent status email');
    return null;
  }

  const c = getStatusContent(name, status, tempPassword);
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
            .header { background-color: #013358; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header img { border-radius: 50%; margin-bottom: 10px; background-color: white; padding: 4px; }
            .content { padding: 30px; background-color: #ffffff; border: 1px solid #eaeaea; border-top: none; border-radius: 0 0 8px 8px; }
            body { background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
            
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

  // Helper to convert markdown to HTML for rich emails
  function convertMarkdownToHtml(text: string): string {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.*?)$/gm, '<h3 style="margin: 16px 0 8px 0; font-size: 16px; font-weight: bold; color: #013358;">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="margin: 20px 0 10px 0; font-size: 18px; font-weight: bold; color: #013358;">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 style="margin: 24px 0 12px 0; font-size: 22px; font-weight: bold; color: #013358;">$1</h1>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Markdown Links: [text](url) -> <a href="url">text</a>
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
      const cleanUrl = url.replace(/&amp;/g, '&');
      return `<a href="${cleanUrl}" style="color: #013358; text-decoration: underline; font-weight: 600;">${linkText}</a>`;
    });

    // Bullets
    html = html.replace(/^(?:•|-|\*)\s+(.*?)$/gm, '<li style="margin-bottom: 6px;">$1</li>');

    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');

    // Wrap list items in <ul> tags
    html = html.replace(/(<li.*?>.*?<\/li>)+/g, '<ul style="padding-left: 20px; margin: 12px 0;">$&</ul>');

    // Cleanup extra newlines inside list wrappers
    html = html.replace(/<ul style="padding-left: 20px; margin: 12px 0;"><br>/g, '<ul style="padding-left: 20px; margin: 12px 0;">');
    html = html.replace(/<\/ul><br>/g, '</ul>');
    html = html.replace(/<li(.*?)><br>/g, '<li$1>');
    html = html.replace(/<\/li><br>/g, '</li>');

    return html;
  }

  const bodyHtml = convertMarkdownToHtml(body);

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

export async function sendZoraAccessRequestNotification(params: {
  fullName: string;
  email: string;
  organizationName: string;
  role: string;
  phone?: string | null;
  useCase: string;
  requestId: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Email service not configured - skipping Zora access request notification');
    return null;
  }

  const adminEmail = 'abdulrahman.dauda@cosmopolitan.edu.ng';
  const fimsBaseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const reviewUrl = `${fimsBaseUrl}/requests/zora-requests`;
  const fromAddress = getFromAddress();
  const subject = `New Zora Access Request: ${params.fullName} (${params.organizationName})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>New Zora Access Request</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 20px; background-color: #f8fafc; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .header { background: #075d37; color: #ffffff; padding: 24px 28px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 4px 0 0; opacity: 0.9; font-size: 13px; }
          .content { padding: 28px; }
          .field { margin-bottom: 14px; }
          .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
          .value { font-size: 14px; color: #0f172a; margin-top: 3px; font-weight: 500; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #334155; }
          .btn { display: inline-block; background: #075d37; color: #ffffff !important; text-decoration: none; padding: 11px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 18px; }
          .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>CCSA Zora — New Access Request</h1>
            <p>Centre for Climate-Smart Agriculture · Cosmopolitan University Abuja</p>
          </div>
          <div class="content">
            <p style="margin-top: 0; font-size: 14px; color: #334155;">
              A new user has submitted a request for institutional access to the <strong>CCSA Zora</strong> workspace.
            </p>
            <div class="field">
              <div class="label">Applicant Name</div>
              <div class="value">${params.fullName}</div>
            </div>
            <div class="field">
              <div class="label">Organization / State ADP</div>
              <div class="value">${params.organizationName}</div>
            </div>
            <div class="field">
              <div class="label">Agricultural Role</div>
              <div class="value"><span class="badge">${params.role}</span></div>
            </div>
            <div class="field">
              <div class="label">Work Email</div>
              <div class="value"><a href="mailto:${params.email}" style="color: #075d37;">${params.email}</a></div>
            </div>
            ${params.phone ? `<div class="field"><div class="label">Phone / WhatsApp</div><div class="value">${params.phone}</div></div>` : ''}
            <div class="field">
              <div class="label">Intended Use & Operational Focus</div>
              <div class="box">${params.useCase}</div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${reviewUrl}" class="btn">Review & Grant Access in FIMS</a>
            </div>
          </div>
          <div class="footer">
            Centre for Climate-Smart Agriculture (CCSA) · Automated notification to ${adminEmail}
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [adminEmail],
      subject,
      html,
      text: `New Zora Access Request\n\nName: ${params.fullName}\nEmail: ${params.email}\nOrg: ${params.organizationName}\nRole: ${params.role}\nUse Case: ${params.useCase}\n\nReview in FIMS: ${reviewUrl}`,
    });
    if (error) {
      console.error('Error sending Zora access notification:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error sending Zora access notification:', err);
    return null;
  }
}

export async function sendZoraCredentialsEmail(params: {
  recipientEmail: string;
  recipientName: string;
  temporaryPassword: string;
  loginUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('Email service not configured - skipping Zora credentials email');
    return null;
  }

  const fromAddress = getFromAddress();
  const subject = 'Your CCSA Zora Workspace Access Credentials';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Your Zora Credentials</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 20px; background-color: #f8fafc; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .header { background: #075d37; color: #ffffff; padding: 24px 28px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 4px 0 0; opacity: 0.9; font-size: 13px; }
          .content { padding: 28px; }
          .cred-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .cred-item { margin-bottom: 10px; }
          .cred-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #166534; }
          .cred-value { font-size: 15px; font-family: ui-monospace, monospace; color: #0f172a; font-weight: 600; margin-top: 2px; }
          .btn { display: inline-block; background: #075d37; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 14px; }
          .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Welcome to CCSA Zora</h1>
            <p>Centre for Climate-Smart Agriculture · Cosmopolitan University Abuja</p>
          </div>
          <div class="content">
            <p style="margin-top: 0; font-size: 14px; color: #334155;">
              Dear ${params.recipientName},
            </p>
            <p style="font-size: 14px; color: #334155;">
              Your application for institutional access to <strong>CCSA Zora (Agricultural Super Intelligence)</strong> has been approved. Your workspace account is now active.
            </p>
            <div class="cred-box">
              <div class="cred-item">
                <div class="cred-label">Login Email Address</div>
                <div class="cred-value">${params.recipientEmail}</div>
              </div>
              <div class="cred-item" style="margin-bottom: 0;">
                <div class="cred-label">Temporary Password</div>
                <div class="cred-value" style="background: #ffffff; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block;">
                  ${params.temporaryPassword}
                </div>
              </div>
            </div>
            <p style="font-size: 13px; color: #64748b;">
              For security, please sign in and change your password upon your first session.
            </p>
            <div style="text-align: center; margin: 24px 0 10px;">
              <a href="${params.loginUrl}" class="btn">Sign In to Zora Workspace</a>
            </div>
          </div>
          <div class="footer">
            Centre for Climate-Smart Agriculture (CCSA) · Cosmopolitan University Abuja
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [params.recipientEmail],
      subject,
      html,
      text: `Hello ${params.recipientName},\n\nYour CCSA Zora account has been approved!\n\nEmail: ${params.recipientEmail}\nTemporary Password: ${params.temporaryPassword}\n\nSign In: ${params.loginUrl}`,
    });
    if (error) {
      console.error('Error sending Zora credentials email:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error sending Zora credentials email:', err);
    return null;
  }
}

