import { Request, Response } from 'express';
import { auth as firebaseAdmin } from '../firebase/admin';
import { z } from 'zod';
import crypto from 'crypto';
import { generateOTP, logOTPToConsole, sendOTPEmail } from '../emailService';
import { PromoCodeService } from '../services/promoCodeService';

// Simple in-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { 
  otp: string; 
  expires: number; 
  userData: any;
  attempts: number;
}>();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  couponCode: z.string().optional()
});

const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

/**
 * Check if Firebase user exists
 */
async function checkFirebaseUserExists(email: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking if Firebase user exists for email: ${email}`);
    const user = await firebaseAdmin.getUserByEmail(email);
    console.log(`✓ Firebase user found: ${user.uid}`);
    return true;
  } catch (error: any) {
    console.log(`Firebase user check error for ${email}:`, error.code);
    if (error.code === 'auth/user-not-found') {
      console.log(`✓ Firebase user not found for ${email} - proceeding with signup`);
      return false;
    }
    console.error(`❌ Unexpected Firebase error for ${email}:`, error);
    throw error;
  }
}

/**
 * Signup Flow: 1. Check if user exists -> 2. Send OTP if new user
 */
export async function hybridSignup(req: Request, res: Response) {
  try {
    const validatedData = signupSchema.parse(req.body);
    const email = validatedData.email.toLowerCase();

    // Check if user already exists in Firebase
    const userExists = await checkFirebaseUserExists(email);

    if (userExists) {
      return res.status(400).json({ 
        message: 'Email already registered, sign in.',
        code: 'USER_EXISTS',
        action: 'signin'
      });
    }

    // User doesn't exist, send OTP
    const otp = generateOTP();

    // Check promo code using PromoCodeService
    let userTier = 'free';
    let promoCodeValid = false;

    if (validatedData.couponCode && validatedData.couponCode.trim()) {
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
      console.log(`Validating promo code: ${validatedData.couponCode} for user: ${email}`);

      const promoCodeService = new PromoCodeService();
      const validation = await promoCodeService.validatePromoCode(validatedData.couponCode, email, clientIP);

      if (validation.isValid && validation.tier) {
        userTier = validation.tier;
        promoCodeValid = true;
        console.log(`✓ Promo code ${validatedData.couponCode} is valid for user: ${email} - Tier: ${userTier}`);
      } else {
        console.log(`✗ Invalid promo code ${validatedData.couponCode} for user: ${email} - ${validation.errorMessage}`);
      }
    } else {
      console.log(`No promo code provided for user: ${email} - Creating free account`);
    }

    // Store user data with OTP
    const userData = {
      email,
      password: validatedData.password, // We'll hash this after OTP verification
      firstName: validatedData.firstName || '',
      lastName: validatedData.lastName || '',
      tier: userTier,
      couponCode: validatedData.couponCode,
      promoCodeValid,
      provider: 'email'
    };

    // Store OTP with user data
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      userData,
      attempts: 0
    });

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, userData.firstName + ' ' + userData.lastName);

    if (!emailSent) {
      console.log('📧 Email sending failed, falling back to console logging');
      logOTPToConsole(email, userData.firstName + ' ' + userData.lastName, otp);
    }

    // Auto-cleanup OTP after expiration
    setTimeout(() => {
      otpStore.delete(email);
    }, 10 * 60 * 1000);

    return res.status(200).json({
      message: 'Verification code sent to your email address!',
      email,
      requiresVerification: true,
      devNote: 'Check your email inbox for the OTP code'
    });

  } catch (error: any) {
    console.error('Hybrid signup error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    return res.status(500).json({ message: 'Signup failed' });
  }
}

/**
 * Signin Flow: 1. Check if user exists -> 2. Authenticate if exists
 */
export async function hybridSignin(req: Request, res: Response) {
  try {
    const validatedData = signinSchema.parse(req.body);
    const email = validatedData.email.toLowerCase();

    // Check if user exists in Firebase
    const userExists = await checkFirebaseUserExists(email);

    if (!userExists) {
      return res.status(400).json({ 
        message: 'Email is not registered, sign up.',
        code: 'USER_NOT_FOUND',
        action: 'signup'
      });
    }

    // For Firebase-first approach, we need to use client-side Firebase Auth
    // Return user exists confirmation, client will handle Firebase authentication
    try {
      const firebaseUser = await firebaseAdmin.getUserByEmail(email);

      return res.status(200).json({
        message: 'User found, use client-side Firebase authentication',
        action: 'firebase_auth',
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        }
      });

    } catch (error: any) {
      return res.status(401).json({ 
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }

  } catch (error: any) {
    console.error('Hybrid signin error:', error);
    return res.status(500).json({ message: 'Signin failed' });
  }
}

/**
 * Verify OTP and create Firebase user
 */
export async function hybridVerifyOTP(req: Request, res: Response) {
  try {
    const validatedData = verifyOTPSchema.parse(req.body);
    const email = validatedData.email.toLowerCase();
    const otp = validatedData.otp;

    // Get stored OTP data
    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ 
        message: 'OTP expired or invalid. Please request a new code.',
        code: 'OTP_EXPIRED'
      });
    }

    // Check if OTP expired
    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ 
        message: 'OTP expired. Please request a new code.',
        code: 'OTP_EXPIRED'
      });
    }

    // Check attempt limit
    if (storedData.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ 
        message: 'Too many failed attempts. Please request a new code.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts++;
      return res.status(400).json({ 
        message: 'Invalid OTP code. Please try again.',
        code: 'INVALID_OTP',
        attemptsLeft: 5 - storedData.attempts
      });
    }

    // OTP verified, create Firebase user
    try {
      const userData = storedData.userData;

      // Create Firebase user
      const firebaseUser = await firebaseAdmin.createUser({
        email: userData.email,
        password: userData.password,
        emailVerified: true,
        displayName: `${userData.firstName} ${userData.lastName}`.trim(),
      });

      // CRITICAL: Apply promo code and ensure tier is correctly set
      let finalTier = userData.tier; // Default from signup validation
      
      if (userData.promoCodeValid && userData.couponCode) {
        console.log(`🎯 APPLYING PROMO CODE: ${userData.couponCode} for ${userData.email} with expected tier: ${userData.tier}`);
        
        const promoCodeService = new PromoCodeService();
        const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'Unknown';

        const applied = await promoCodeService.applyPromoCode(
          userData.couponCode,
          userData.email,
          firebaseUser.uid,
          clientIP,
          userAgent
        );

        if (applied) {
          console.log(`✅ PROMO CODE APPLIED: ${userData.couponCode} for ${userData.email} - Tier: ${finalTier}`);
        } else {
          console.error(`❌ PROMO CODE ERROR: Failed to apply promo code ${userData.couponCode} for ${userData.email}`);
          console.log(`User will be created with free tier - promo code application failed`);
        }
      } else {
        console.log(`📋 No promo code for user: ${userData.email} - Creating ${finalTier} tier account`);
      }

      // Set Firebase custom claims as single source of truth with confirmed tier
      await firebaseAdmin.setCustomUserClaims(firebaseUser.uid, {
        tier: finalTier,
        couponCode: userData.couponCode,
        provider: userData.provider,
        createdAt: new Date().toISOString()
      });
      
      console.log(`🔥 FIREBASE CUSTOM CLAIMS SET: tier=${finalTier}, couponCode=${userData.couponCode} for ${userData.email}`);

      console.log(`✓ Firebase user created with tier: ${userData.tier} for ${userData.email}`);
      console.log(`✓ Firebase custom claims set:`, { 
        tier: userData.tier, 
        couponCode: userData.couponCode, 
        provider: userData.provider 
      });
      console.log(`✓ PostgreSQL sync will happen when user signs in`);

      // Clean up OTP
      otpStore.delete(email);

      // Create custom token for immediate signin
      const customToken = await firebaseAdmin.createCustomToken(firebaseUser.uid);

      return res.status(200).json({
        message: 'Email verified successfully! Account created.',
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          tier: userData.tier
        },
        token: customToken,
        verified: true
      });

    } catch (error: any) {
      console.error('Firebase user creation error:', error);

      if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({ 
          message: 'Email already registered',
          code: 'USER_EXISTS'
        });
      }

      return res.status(500).json({ 
        message: 'Failed to create account',
        code: 'ACCOUNT_CREATION_FAILED'
      });
    }

  } catch (error: any) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ message: 'Verification failed' });
  }
}

/**
 * Resend OTP
 */
export async function hybridResendOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase();
    let storedData = otpStore.get(normalizedEmail);

    // If no stored data found, this means the user is trying to resend after expiration
    // Check if there's any recent signup attempt data we can recover
    if (!storedData) {
      // For expired OTP cases, we need the user to start the signup process again
      // as we don't persist signup data beyond OTP expiration
      return res.status(400).json({ 
        message: 'Your verification session has expired. Please sign up again to receive a new code.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Generate new OTP
    const newOTP = generateOTP();

    // Update stored data with new 5-minute expiration
    storedData.otp = newOTP;
    storedData.expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    storedData.attempts = 0;

    // Send new OTP email
    const userData = storedData.userData;
    const emailSent = await sendOTPEmail(normalizedEmail, newOTP, userData.firstName + ' ' + userData.lastName);

    if (!emailSent) {
      console.log('📧 Email sending failed, falling back to console logging');
      logOTPToConsole(normalizedEmail, userData.firstName + ' ' + userData.lastName, newOTP);
    }

    return res.status(200).json({
      message: 'New verification code sent to your email address!',
      email: normalizedEmail
    });

  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Failed to resend OTP' });
  }
}