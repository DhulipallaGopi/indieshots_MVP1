import { Request, Response } from 'express';
import { storage } from '../storage';
import { generateToken } from '../auth/jwt';

// Simple Firebase sync controller without complex nested try-catch blocks
export const syncFirebaseUser = async (req: Request, res: Response) => {
  try {
    const { firebaseUser, provider } = req.body;
    
    if (!firebaseUser?.email) {
      return res.status(400).json({ message: 'Missing Firebase user data' });
    }
    
    console.log('Firebase sync for:', firebaseUser.email);
    
    // REMOVED ALL AUTO-UPGRADE LOGIC - Users default to FREE tier only
    console.log(`Account creation: ${firebaseUser.email} will default to FREE tier (no automatic upgrades)`);
    const shouldBeProTier = false; // Always false - no automatic pro tier assignment
    
    // Get or create user with proper tier assignment
    let user = await storage.getUserByEmail(firebaseUser.email.toLowerCase());
    
    if (!user) {
      // Create new user - DEFAULT IS FREE TIER unless promo code exists
      const tier = shouldBeProTier ? 'pro' : 'free';
      user = await storage.createUser({
        email: firebaseUser.email.toLowerCase(),
        firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        provider: provider || 'firebase',
        providerId: firebaseUser.uid,
        tier,
        totalPages: tier === 'pro' ? -1 : 10,
        maxShotsPerScene: tier === 'pro' ? -1 : 5,
        canGenerateStoryboards: tier === 'pro',
        emailVerified: firebaseUser.emailVerified || false,
        firebaseUID: firebaseUser.uid,
        displayName: firebaseUser.displayName || null
      });
      console.log(`✅ Created new user: ${user.email} with ${tier} tier (promo code: ${shouldBeProTier ? 'YES' : 'NO'})`);
    } else {
      // For existing users, NO automatic tier corrections - keep their current database tier
      console.log(`✓ Existing user: ${user.email} - keeping current tier: ${user.tier} (no automatic changes)`);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    };
    
    res.cookie('auth_token', token, cookieOptions);
    
    // Return user data
    const { password, ...userData } = user;
    
    const responseData = { 
      ...userData, 
      message: 'User synced successfully',
      redirectTo: '/dashboard',
      authenticated: true
    };
    
    console.log(`✓ Firebase sync successful for ${user.email} - tier: ${user.tier}`);
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('Firebase sync error:', error);
    res.status(500).json({ message: 'Failed to sync user data' });
  }
};
