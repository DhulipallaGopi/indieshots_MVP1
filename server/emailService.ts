import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Free email service using Gmail SMTP - no API keys required!

// Generate 6-digit OTP
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Log OTP to console for development
export const logOTPToConsole = (email: string, name: string, otp: string): void => {
  console.log(`\n🔐 EMAIL VERIFICATION OTP`);
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Name: ${name || 'User'}`);
  console.log(`🔑 OTP Code: ${otp}`);
  console.log(`⏰ Expires in 5 minutes`);
  console.log(`===============================\n`);
};

// Create Gmail SMTP transporter (free email service)
const createEmailTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailPass) {
    console.log('📧 Gmail credentials not found, using console logging for development');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });
};

// Send OTP email using free Gmail SMTP
export const sendOTPEmail = async (email: string, otp: string, name?: string): Promise<boolean> => {
  try {
    const transporter = createEmailTransporter();
    
    if (!transporter) {
      // Fallback to console logging if no email credentials
      console.log(`\n=== EMAIL VERIFICATION OTP ===`);
      console.log(`Email: ${email}`);
      console.log(`Name: ${name || 'User'}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`=== Use this code to verify your email ===\n`);
      return true;
    }
    
    // Professional email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #3b0764; font-size: 24px; font-weight: bold; }
          .otp-code { background: #f3f4f6; border: 2px dashed #3b0764; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .code { font-size: 32px; font-weight: bold; color: #3b0764; letter-spacing: 3px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎬 IndieShots</div>
            <h2>Email Verification</h2>
          </div>
          
          <p>Hello ${name || 'there'}!</p>
          <p>Welcome to IndieShots! Please verify your email address to complete your account setup.</p>
          
          <div class="otp-code">
            <p style="margin: 0; font-size: 16px;">Your verification code is:</p>
            <div class="code">${otp}</div>
          </div>
          
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          
          <div class="footer">
            <p>Best regards,<br>The IndieShots Team</p>
            <p>Transform your screenplays into professional shot lists with AI-powered precision.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: `"IndieShots Verification" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Your IndieShots verification code: ${otp}`,
      html: htmlContent,
      text: `Hello ${name || 'there'}!\n\nYour IndieShots verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nBest regards,\nThe IndieShots Team`
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    // Fallback to console logging if email fails
    console.log(`\n=== EMAIL VERIFICATION OTP (Fallback) ===`);
    console.log(`Email: ${email}`);
    console.log(`Name: ${name || 'User'}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`=== Use this code to verify your email ===\n`);
    return true;
  }
};

// Verify OTP (simple in-memory store for demo - in production use Redis or database)
const otpStore = new Map<string, { otp: string; expires: number; userData: any }>();

export const storeOTP = (email: string, otp: string, userData: any): void => {
  const expires = Date.now() + (5 * 60 * 1000); // 5 minutes
  otpStore.set(email, { otp, expires, userData });
  
  // Clean up expired OTPs
  setTimeout(() => {
    otpStore.delete(email);
  }, 5 * 60 * 1000);
};

export const verifyOTP = (email: string, otp: string): { valid: boolean; userData?: any } => {
  const stored = otpStore.get(email);
  
  if (!stored) {
    return { valid: false };
  }
  
  if (Date.now() > stored.expires) {
    otpStore.delete(email);
    return { valid: false };
  }
  
  if (stored.otp !== otp) {
    return { valid: false };
  }
  
  const userData = stored.userData;
  otpStore.delete(email);
  return { valid: true, userData };
};

export const resendOTP = async (email: string): Promise<boolean> => {
  const stored = otpStore.get(email);
  if (!stored) {
    return false;
  }
  
  const newOTP = generateOTP();
  const success = await sendOTPEmail(email, newOTP, stored.userData.firstName);
  
  if (success) {
    storeOTP(email, newOTP, stored.userData);
  }
  
  return success;
};