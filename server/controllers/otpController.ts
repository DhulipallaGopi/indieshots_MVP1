import { Request, Response } from 'express';
import { storage } from '../storage';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import crypto from 'crypto';
import { generateToken } from '../auth/jwt';

// Simple in-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { 
  otp: string; 
  expires: number; 
  userData: any;
  attempts: number;
}>();

// Generate 6-digit OTP
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP with user data
export const storeOTP = (email: string, otp: string, userData: any): void => {
  const expires = Date.now() + (5 * 60 * 1000); // 5 minutes
  otpStore.set(email.toLowerCase(), { 
    otp, 
    expires, 
    userData,
    attempts: 0
  });
  
  // Auto cleanup after expiry
  setTimeout(() => {
    otpStore.delete(email.toLowerCase());
  }, 10 * 60 * 1000);
};

// Validation schemas
const registerSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  couponCode: z.string().optional()
});

/**
 * Register new user - sends OTP for email verification
 */
export async function registerWithOTP(req: Request, res: Response) {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if email already exists
    const existingUser = await storage.getUserByEmail(validatedData.email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);
    
    // DEFAULT TO FREE TIER - Only upgrade if valid promo code is provided
    let tier = 'free';
    let totalPages = 10;
    let maxShotsPerScene = 5;
    let canGenerateStoryboards = false;
    
    // Check if user provided a valid promo code
    if (validatedData.couponCode) {
      try {
        // Import PromoCodeService to validate promo code
        const { PromoCodeService } = await import('../services/promoCodeService');
        const promoService = new PromoCodeService();
        
        const validation = await promoService.validatePromoCode(
          validatedData.couponCode,
          validatedData.email.toLowerCase()
        );
        
        if (validation.isValid) {
          console.log(`✓ Valid promo code ${validatedData.couponCode} - upgrading to pro tier`);
          tier = 'pro';
          totalPages = -1; // Unlimited for pro
          maxShotsPerScene = -1; // Unlimited for pro
          canGenerateStoryboards = true;
        } else {
          console.log(`❌ Invalid promo code ${validatedData.couponCode} - staying on free tier`);
        }
      } catch (error) {
        console.error('Promo code validation failed:', error);
        // Continue with free tier if promo code validation fails
      }
    }
    
    console.log(`Creating new user with tier: ${tier}, pages: ${totalPages}`);
    
    // Prepare user data
    const userData = {
      email: validatedData.email.toLowerCase(),
      firstName: validatedData.firstName || '',
      lastName: validatedData.lastName || '',
      password: hashedPassword,
      provider: 'local',
      tier: tier,
      totalPages: totalPages,
      maxShotsPerScene: maxShotsPerScene,
      canGenerateStoryboards: canGenerateStoryboards,
      usedPages: 0,
      couponCode: validatedData.couponCode
    };
    
    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(userData.email, otp, userData);
    
    // Log OTP to console for development
    console.log(`\n🔐 EMAIL VERIFICATION OTP`);
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Name: ${userData.firstName} ${userData.lastName}`);
    console.log(`🔑 OTP Code: ${otp}`);
    console.log(`⏰ Expires in 5 minutes`);
    console.log(`===============================\n`);
    
    res.status(200).json({
      message: 'Verification code sent! Check the server console for your OTP.',
      email: userData.email,
      requiresVerification: true,
      devNote: 'For development: Check server console for OTP code'
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
}

/**
 * Verify OTP and create user account
 */
export async function verifyOTP(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    const stored = otpStore.get(email.toLowerCase());
    
    if (!stored) {
      return res.status(400).json({ message: 'No verification pending for this email' });
    }
    
    // Check expiry
    if (Date.now() > stored.expires) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }
    
    // Check attempts (prevent brute force)
    if (stored.attempts >= 5) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ message: 'Too many failed attempts. Please register again.' });
    }
    
    // Verify OTP
    if (stored.otp !== otp) {
      stored.attempts++;
      return res.status(400).json({ 
        message: 'Invalid OTP code', 
        attemptsLeft: 5 - stored.attempts 
      });
    }
    
    // Create user account
    const userData = stored.userData;
    const user = await storage.createUser({
      ...userData,
      verificationToken: null, // Email verified
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Clean up OTP
    otpStore.delete(email.toLowerCase());
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    // Return user data (exclude password)
    const { password, ...userResponse } = user;
    
    res.status(201).json({
      message: 'Email verified! Account created successfully.',
      user: userResponse,
      token
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
}

/**
 * Resend OTP
 */
export async function resendOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const stored = otpStore.get(email.toLowerCase());
    
    if (!stored) {
      return res.status(400).json({ message: 'No verification pending for this email' });
    }
    
    // Generate new OTP
    const newOTP = generateOTP();
    
    // Update stored data
    stored.otp = newOTP;
    stored.expires = Date.now() + (5 * 60 * 1000);
    stored.attempts = 0;
    
    // Log new OTP
    console.log(`\n🔄 RESENT EMAIL VERIFICATION OTP`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New OTP Code: ${newOTP}`);
    console.log(`⏰ Expires in 5 minutes`);
    console.log(`===============================\n`);
    
    res.status(200).json({
      message: 'New verification code sent! Check server console.',
      devNote: 'For development: Check server console for new OTP code'
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP' });
  }
}