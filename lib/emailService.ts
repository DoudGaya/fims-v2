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
    text: `
      Password Reset Request
      
      Hello ${displayName || 'User'},
      
      We received a request to reset your password for your CCSA Admin account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email.
      
      Centre for Climate Smart Agriculture
      Cosmopolitan University Abuja
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

export async function sendAgentStatusEmail(email: string, name: string, status: string) {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn('Email service not configured - skipping agent status email');
    return;
  }
  
  const subject = `Agent Application Status Updated: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  
  const mailOptions = {
    from: `"CCSA Admin" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #013358; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CCSA Mobile</h1>
            </div>
            <div class="content">
              <h2>Application Status Update</h2>
              <p>Hello ${name},</p>
              <p>Your agent application status has been updated to: <strong>${status.toUpperCase()}</strong>.</p>
              <p>Please log in to the dashboard to view more details.</p>
            </div>
            <div class="footer">
              <p>Centre for Climate Smart Agriculture<br>
              Cosmopolitan University Abuja</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Application Status Update
      
      Hello ${name},
      
      Your agent application status has been updated to: ${status.toUpperCase()}.
      
      Centre for Climate Smart Agriculture
      Cosmopolitan University Abuja
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Agent status email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw for status updates to avoid blocking main flow
    return null; 
  }
}
