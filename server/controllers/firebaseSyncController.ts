import { Request, Response } from 'express';
import { storage } from '../storage';
import { generateToken } from '../auth/jwt';
// Removed premium demo override imports
import { PromoCodeUniversalValidator } from '../utils/promoCodeUniversalValidator';

/**
 * Sync Firebase user with local database
 * This creates/updates users from Firebase Auth in our PostgreSQL database
 */
export async function firebaseSync(req: Request, res: Response) {
  try {
    console.log('=== Firebase User Sync ===');
    console.log('Request body received:', JSON.stringify(req.body, null, 2));
    
    const { firebaseUser, idToken, provider } = req.body;
    
    if (!firebaseUser || !firebaseUser.uid || !firebaseUser.email) {
      console.error('Missing required Firebase user data');
      return res.status(400).json({ message: 'Missing required Firebase user data' });
    }
    
    console.log('Syncing Firebase user:', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      provider,
      emailVerified: firebaseUser.emailVerified
    });
    
    // Get Firebase custom claims to extract tier information
    let firebaseCustomClaims = {};
    let tierFromFirebase = 'free';
    
    try {
      // Get Firebase custom claims
      const admin = await import('firebase-admin');
      const firebaseAdmin = admin.default;
      
      if (firebaseAdmin.apps.length) {
        const firebaseUserRecord = await firebaseAdmin.auth().getUser(firebaseUser.uid);
        firebaseCustomClaims = firebaseUserRecord.customClaims || {};
        tierFromFirebase = (firebaseCustomClaims as any).tier || 'free';
        console.log('Firebase custom claims:', firebaseCustomClaims);
        console.log(`Using tier from Firebase: ${tierFromFirebase}`);
      } else {
        console.log('Firebase not initialized, defaulting to free tier');
      }
    } catch (error) {
      console.log('Could not fetch Firebase custom claims:', error);
    }
    
    // Check if user exists by Firebase UID first, then by email as fallback
    let user = await storage.getUserByProviderId(provider, firebaseUser.uid);
    
    if (!user) {
      // Check if user exists by email (for existing accounts)
      try {
        user = await storage.getUserByEmail(firebaseUser.email.toLowerCase());
        if (user) {
          console.log('Found existing user by email, updating Firebase provider info');
          // Update the existing user's provider info to match Firebase
          user = await storage.updateUser(user.id, {
            provider,
            providerId: firebaseUser.uid,
            emailVerified: firebaseUser.emailVerified || false,
          });
        }
      } catch (error) {
        console.log('No existing user found by email');
      }
    }
    
    if (!user) {
      // Create new user from Firebase data
      let firstName = firebaseUser.email?.split('@')[0] || 'User';
      let lastName = '';
      
      if (firebaseUser.displayName) {
        const nameParts = firebaseUser.displayName.split(' ');
        firstName = nameParts[0] || firstName;
        lastName = nameParts.slice(1).join(' ') || '';
      }
      
      console.log('Creating new user from Firebase:', firebaseUser.email);
      
      // CRITICAL FIX: Default to FREE tier for all new users except premium demo
      const isDemo = firebaseUser.email === 'premium@demo.com';
      
      // NEW USERS SHOULD BE FREE BY DEFAULT
      // Only upgrade to pro if they have valid Firebase custom claims with tier: 'pro'
      let finalTier = 'free';
      
      if (isDemo) {
        finalTier = 'pro';
        console.log(`🔒 DEMO ACCOUNT: Creating premium@demo.com with pro tier`);
      } else if (tierFromFirebase === 'pro' && firebaseCustomClaims && (firebaseCustomClaims as any).tier === 'pro') {
        // Only assign pro tier if Firebase explicitly has pro tier in custom claims
        finalTier = 'pro';
        console.log(`🎯 PRO TIER: Creating ${firebaseUser.email} with pro tier from Firebase custom claims`);
      } else {
        // Default to free tier for all new signups
        finalTier = 'free';
        console.log(`🆓 FREE TIER: Creating ${firebaseUser.email} with FREE tier (default for new users)`);
      }
      
      user = await storage.createUser({
        email: firebaseUser.email.toLowerCase(),
        firstName,
        lastName,
        profileImageUrl: firebaseUser.photoURL || null,
        provider,
        providerId: firebaseUser.uid,
        emailVerified: firebaseUser.emailVerified || false,
        tier: finalTier, // Use Firebase custom claims or force pro for demo
        totalPages: finalTier === 'pro' ? -1 : 10, // Pro tier gets unlimited pages, free tier gets 10
        usedPages: 0,
        maxShotsPerScene: finalTier === 'pro' ? -1 : 5, // Pro tier gets unlimited shots, free tier gets 5
        canGenerateStoryboards: finalTier === 'pro', // Legacy field kept for compatibility
      });
      
      console.log('New Firebase user created:', user.email);
    } else {
      // Update existing user with latest Firebase data
      console.log('Updating existing Firebase user:', user.email);
      
      const updates: any = {};
      
      // Update provider info if needed
      if (provider && firebaseUser.uid && user.providerId !== firebaseUser.uid) {
        updates.provider = provider;
        updates.providerId = firebaseUser.uid;
      }
      
      // Update profile image if provided and not already set
      if (firebaseUser.photoURL && !user.profileImageUrl) {
        updates.profileImageUrl = firebaseUser.photoURL;
      }
      
      // Update email verification status
      if (firebaseUser.emailVerified && !user.emailVerified) {
        updates.emailVerified = firebaseUser.emailVerified;
      }
      
      // Update display name if provided
      if (firebaseUser.displayName && (!user.firstName || !user.lastName)) {
        const nameParts = firebaseUser.displayName.split(' ');
        if (!user.firstName) updates.firstName = nameParts[0] || user.firstName;
        if (!user.lastName) updates.lastName = nameParts.slice(1).join(' ') || user.lastName;
      }
      
      // REMOVED ALL AUTOMATIC TIER SYNC - Users keep their database tier only
      console.log(`✓ TIER SYNC DISABLED: ${user.email} - Using database tier: ${user.tier} (no automatic changes)`)
      
      if (Object.keys(updates).length > 0) {
        user = await storage.updateUser(user.id, updates);
      }
      
      // Removed automatic premium@demo.com tier upgrade - use only database values
      
      // REMOVED UNIVERSAL PROMO CODE AUTO-UPGRADE - This was causing new users to get pro tier
      // Promo code validation should only happen during signup, not during regular Firebase sync
      console.log(`✅ FIREBASE SYNC COMPLETE: ${user.email} - no automatic tier changes`)
    
    // Generate JWT token for session without any overrides
    const token = generateToken(user);
    
    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    };
    
    console.log('Setting auth cookie for Firebase user');
    res.cookie('auth_token', token, cookieOptions);
    
    // Set session data
    if (req.session) {
      (req.session as any).userId = user.id;
      (req.session as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tier: user.tier,
      };
    }
    
    console.log('✓ Firebase user sync successful:', user.email);
    console.log('✓ Auth cookie set, session created');
    
    // Return user data (excluding sensitive fields)
    const { password, ...userData } = user;
    
    // Return user data without any tier overrides
    const finalUserData = userData;
    
    const responseData = { 
      ...finalUserData, 
      message: 'User synced successfully',
      redirectTo: '/dashboard',
      authenticated: true
    };
    
    console.log('✓ Sending response with user data:', { id: userData.id, email: userData.email });
    
    res.status(200).json(responseData);
  }
  } catch (error) {
    console.error('Firebase sync error:', error);
    res.status(500).json({ message: 'Failed to sync user data' });
  }
}