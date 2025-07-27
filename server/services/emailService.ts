import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

export interface EmailConfig {
  provider: 'sendgrid' | 'nodemailer';
  sendgridApiKey?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  fromEmail: string;
  fromName: string;
}

export interface PaymentConfirmationData {
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  transactionId: string;
  tier: string;
  paymentMethod: string;
  date: Date;
}

export class EmailService {
  private config: EmailConfig;
  private transporter?: nodemailer.Transporter;

  constructor() {
    this.config = {
      provider: process.env.EMAIL_PROVIDER as 'sendgrid' | 'nodemailer' || 'sendgrid',
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@indieshots.com',
      fromName: process.env.FROM_NAME || 'IndieShots',
      smtpConfig: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
    };

    this.initialize();
  }

  private initialize() {
    if (this.config.provider === 'sendgrid') {
      if (this.config.sendgridApiKey) {
        sgMail.setApiKey(this.config.sendgridApiKey);
        console.log('Email service initialized with SendGrid');
      } else {
        console.warn('SendGrid API key not provided, falling back to nodemailer');
        this.config.provider = 'nodemailer';
      }
    }

    if (this.config.provider === 'nodemailer') {
      this.transporter = nodemailer.createTransport(this.config.smtpConfig);
      console.log('Email service initialized with Nodemailer');
    }
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(data: PaymentConfirmationData): Promise<void> {
    const subject = `Payment Confirmation - IndieShots ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)} Plan`;
    const html = this.generatePaymentConfirmationHTML(data);
    const text = this.generatePaymentConfirmationText(data);

    await this.sendEmail({
      to: data.customerEmail,
      subject,
      html,
      text,
    });

    // Send notification to admin
    await this.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@indieshots.com',
      subject: `New Payment Received - ${data.customerName}`,
      html: this.generateAdminNotificationHTML(data),
      text: `New payment received from ${data.customerName} (${data.customerEmail}) for ${data.tier} plan. Amount: ${data.currency.toUpperCase()} ${data.amount}`,
    });
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailureNotification(customerEmail: string, customerName: string, reason: string): Promise<void> {
    const subject = 'Payment Failed - IndieShots';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Payment Failed</h2>
        <p>Hi ${customerName},</p>
        <p>Unfortunately, we couldn't process your payment for IndieShots Pro plan.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please try again or contact our support team if you continue to experience issues.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.BASE_URL}/upgrade" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Try Again</a>
        </div>
        <p>Best regards,<br>The IndieShots Team</p>
      </div>
    `;

    await this.sendEmail({
      to: customerEmail,
      subject,
      html,
      text: `Hi ${customerName}, your payment for IndieShots Pro plan failed. Reason: ${reason}. Please try again.`,
    });
  }

  /**
   * Send welcome email for new pro users
   */
  async sendWelcomeEmail(customerEmail: string, customerName: string, tier: string): Promise<void> {
    const subject = `Welcome to IndieShots ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to IndieShots ${tier.charAt(0).toUpperCase() + tier.slice(1)}!</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hi ${customerName},</p>
          <p>Thank you for upgrading to IndieShots ${tier.charAt(0).toUpperCase() + tier.slice(1)}! You now have access to:</p>
          <ul style="line-height: 1.6;">
            <li>✨ <strong>Unlimited Pages</strong> - Upload scripts of any length</li>
            <li>🎬 <strong>Unlimited Shots</strong> - Generate comprehensive shot lists</li>
            <li>🖼️ <strong>AI Storyboards</strong> - Create visual storyboards with DALL-E 3</li>
            <li>⚡ <strong>Priority Support</strong> - Get help when you need it</li>
            <li>📊 <strong>Advanced Analytics</strong> - Track your project progress</li>
          </ul>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.BASE_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Start Creating</a>
          </div>
          <p>Need help getting started? Check out our <a href="${process.env.BASE_URL}/help">Help Center</a> or reply to this email.</p>
          <p>Best regards,<br>The IndieShots Team</p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: customerEmail,
      subject,
      html,
      text: `Welcome to IndieShots ${tier}! You now have access to unlimited pages, unlimited shots, AI storyboards, and priority support.`,
    });
  }

  /**
   * Send generic email
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      if (this.config.provider === 'sendgrid' && this.config.sendgridApiKey) {
        await sgMail.send({
          to: options.to,
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName,
          },
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
      } else if (this.transporter) {
        await this.transporter.sendMail({
          from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
      } else {
        throw new Error('No email provider configured');
      }

      console.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Generate payment confirmation HTML
   */
  private generatePaymentConfirmationHTML(data: PaymentConfirmationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Payment Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your payment</p>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #1f2937;">Payment Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">IndieShots ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.currency.toUpperCase()} ${data.amount}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.transactionId}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Payment Method:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Date:</strong></td>
              <td style="padding: 8px;">${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}</td>
            </tr>
          </table>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${process.env.BASE_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Access Your Account</a>
          </div>
          <p>If you have any questions about your payment, please contact us at <a href="mailto:support@indieshots.com">support@indieshots.com</a></p>
          <p>Best regards,<br>The IndieShots Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate payment confirmation plain text
   */
  private generatePaymentConfirmationText(data: PaymentConfirmationData): string {
    return `
Payment Confirmed - IndieShots

Hi ${data.customerName},

Your payment has been successfully processed!

Payment Details:
- Plan: IndieShots ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}
- Amount: ${data.currency.toUpperCase()} ${data.amount}
- Transaction ID: ${data.transactionId}
- Payment Method: ${data.paymentMethod}
- Date: ${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}

You can now access your upgraded account at: ${process.env.BASE_URL}/dashboard

If you have any questions, please contact us at support@indieshots.com

Best regards,
The IndieShots Team
    `;
  }

  /**
   * Generate admin notification HTML
   */
  private generateAdminNotificationHTML(data: PaymentConfirmationData): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">New Payment Received</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.customerName} (${data.customerEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Plan:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">IndieShots ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.currency.toUpperCase()} ${data.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Payment Method:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${data.paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Date:</strong></td>
            <td style="padding: 8px;">${data.date.toLocaleDateString()} ${data.date.toLocaleTimeString()}</td>
          </tr>
        </table>
      </div>
    `;
  }
}