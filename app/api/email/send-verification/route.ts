import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromAddress = process.env.EMAIL_FROM || 'CCSA <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const pinId = uuidv4();

    // Store the OTP in Redis, expiring in 10 minutes (600 seconds)
    await redis.set(`email_otp:${pinId}`, otp, { ex: 600 });

    let emailSent = false;
    let emailError: string | null = null;

    if (resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: fromAddress,
          to: email,
          subject: 'Your CCSA Verification Code',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; padding: 20px 0; }
                  .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                  .header { background: #013358; padding: 24px; text-align: center; color: white; }
                  .content { padding: 32px 24px; text-align: center; }
                  .code-box { font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #013358; background: #f0fdf4; border: 1px dashed #16a34a; border-radius: 6px; padding: 14px 20px; margin: 24px 0; display: inline-block; }
                  .footer { background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin: 0; font-size: 22px;">CCSA Verification Code</h1>
                  </div>
                  <div class="content">
                    <p style="margin: 0 0 16px; font-size: 15px; color: #4b5563;">Use the verification code below to complete your verification:</p>
                    <div class="code-box">${otp}</div>
                    <p style="margin: 16px 0 0; font-size: 13px; color: #9ca3af;">This code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
                  </div>
                  <div class="footer">
                    &copy; ${new Date().getFullYear()} Centre for Community Social Action (CCSA). All rights reserved.
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (error) {
          console.warn('Resend send email warning:', error);
          emailError = error.message;
        } else {
          emailSent = true;
          console.log(`✉️ Email OTP sent successfully to ${email} (ID: ${data?.id})`);
        }
      } catch (err: any) {
        console.error('Resend send error:', err);
        emailError = err.message;
      }
    } else {
      console.warn('RESEND_API_KEY not configured, falling back to mock log');
    }

    console.log(`\n========================================`);
    console.log(`✉️ EMAIL OTP DISPATCH`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`Status: ${emailSent ? 'Delivered via Resend' : `Fallback/Mock (${emailError || 'no resend key'})`}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      pinId,
      to: email,
      smsStatus: emailSent ? 'Message Sent' : 'Message Sent (Fallback)',
      ...(emailError && { warning: emailError }),
    });
  } catch (error: any) {
    console.error('Email send-verification error:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
}
