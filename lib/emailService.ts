import nodemailer from 'nodemailer';

// Create email transporter (lazy initialization)
function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(email: string, resetToken: string, displayName: string) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"CCSA Admin" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your CCSA Admin Password',
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendAgentStatusEmail(email: string, firstName: string, status: string, notes?: string) {
  const transporter = createTransporter();
  if (!transporter) {
    // Only log warning if dev, otherwise might want to throw or handle gracefully
    console.warn('Email service: Transporter unavailable');
    return;
  }

  const statusMap: Record<string, { subject: string; message: string }> = {
    'CallForInterview': {
      subject: 'Update on your Field Agent Application',
      message: `<p>We are pleased to inform you that your application has been reviewed, and we would like to invite you for an interview.</p>
                  <p>Our team will contact you shortly via phone to schedule the time and details.</p>`
    },
    'Accepted': {
      subject: 'Congratulations! Application Accepted',
      message: `<p>We are excited to inform you that you have been selected to join our team as a Field Agent.</p>
                  <p>To finalize your onboarding, please prepare your NIN and Bank Details. An admin will finalize your enrollment soon.</p>`
    },
    'Rejected': {
      subject: 'Update on your Application',
      message: `<p>Thank you for your interest in joining us. After careful review, we regret to inform you that we will not be proceeding with your application at this time.</p>
                  <p>We wish you the best in your future endeavors.</p>`
    },
    'Enrolled': {
      subject: 'Welcome to the Team! Account Active',
      message: `<p>Your account has been fully activated. You can now log in to the mobile application and dashboard to start your duties.</p>
                  <p>Welcome aboard!</p>`
    }
  };

  const statusInfo = statusMap[status];

  // If unknown status, don't send generic email, might be internal status
  if (!statusInfo) return;

  const mailOptions = {
    from: `"CCSA Recruitment" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: statusInfo.subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
             body { font-family: sans-serif; color: #333; }
             .container { max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
             .header { background: #008751; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
               <h2>CCSA Field Agent Application</h2>
            </div>
            <div style="padding: 20px;">
               <p>Dear ${firstName},</p>
               ${statusInfo.message}
               ${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ''}
               <p>Best regards,<br/>The CCSA Team</p>
            </div>
          </div>
        </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Agent status email (${status}) sent to ${email}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('Failed to send agent status email', err);
    // Don't throw, just log, so API flow doesn't break if email fails
  }
}
