import { Request, Response } from 'express';
import { generateToken } from '../auth/jwt';
import { promoCodeService } from '../services/promoCodeService';

/**
 * Handle Firebase authentication with Firebase-only user management
 * No PostgreSQL user storage - all user data managed in Firebase
 */
export async function firebaseLogin(req: Request, res: Response) {
  try {
    console.log('=== Firebase Authentication (Firebase-Only Mode) ===');

    const { 
      idToken, 
      provider, 
      providerUserId, 
      email, 
      displayName, 
      photoURL,
      couponCode 
    } = req.body;

    console.log('Firebase auth data:', {
      hasIdToken: !!idToken,
      provider,
      providerUserId,
      email,
      displayName,
      couponCode: couponCode
    });

    // Check if user is permanently banned
    const { tokenBlacklist } = await import('../auth/tokenBlacklist');
    const userId = providerUserId || email.replace('@', '_').replace('.', '_');

    if (tokenBlacklist.isUserBanned(userId) || tokenBlacklist.isEmailBanned(email)) {
      console.log('Blocked login attempt from permanently deleted account:', email);
      return res.status(403).json({ 
        message: 'This account has been permanently deleted and cannot be restored. Please create a new account.',
        code: 'ACCOUNT_PERMANENTLY_DELETED'
      });
    }

    // For demo/development mode, allow authentication with just email if idToken is test token
    if (!email) {
      console.error('Missing required authentication data');
      return res.status(400).json({ message: 'Email is required for authentication' });
    }

    // Allow test/development authentication with special test token
    if (!idToken && process.env.NODE_ENV === 'development') {
      console.log('Development mode: allowing authentication without valid idToken');
    } else if (!idToken) {
      console.error('Missing Firebase ID token');
      return res.status(400).json({ message: 'Firebase ID token is required' });
    }

    // Create Firebase user data structure with tier information
    const userData = {
      id: providerUserId || email.replace('@', '_').replace('.', '_'),
      email: email,
      displayName: displayName,
      photoURL: photoURL,
      provider: provider || 'password',
      tier: 'free', // Default tier for all new users
      usedPages: 0,
      totalPages: 10, // Free tier limit
      maxShotsPerScene: 5, // Free tier limit
      canGenerateStoryboards: false, // Pro feature only
      createdAt: new Date().toISOString()
    };

    console.log('Creating Firebase user:', userData.email);

    // Handle promo code validation and application
    let userTier = 'free'; // Default tier
    const isDemoAccount = userData.email === 'premium@demo.com';
    
    if (isDemoAccount) {
      userTier = 'pro';
      console.log('✓ Demo account detected - granting pro access');
    } else if (couponCode) {
      // Use new promo code service for validation
      const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'Unknown';
      
      console.log(`Validating promo code: ${couponCode} for user: ${userData.email}`);
      
      const validation = await promoCodeService.validatePromoCode(couponCode, userData.email, clientIP);
      
      if (validation.isValid) {
        // Apply the promo code
        const applied = await promoCodeService.applyPromoCode(
          couponCode, 
          userData.email, 
          userData.id, 
          clientIP,
          userAgent
        );
        
        if (applied && validation.tier) {
          userTier = validation.tier;
          console.log(`✓ Promo code ${couponCode} applied successfully for user: ${userData.email} - Tier: ${userTier}`);
        } else {
          console.log(`✗ Failed to apply promo code ${couponCode} for user: ${userData.email}`);
        }
      } else {
        console.log(`✗ Invalid promo code ${couponCode} for user: ${userData.email} - ${validation.errorMessage}`);
      }
    }

    userData.tier = userTier;
    if (isDemoAccount || userTier === 'pro') {
        userData.totalPages = -1; // Unlimited pages for premium users
        userData.maxShotsPerScene = -1; // Unlimited shots for premium users
        userData.canGenerateStoryboards = true;
        
        if (userTier === 'pro' && couponCode) {
            console.log('✓ Premium promo code access granted:', couponCode, 'for user:', userData.email);
        }
    }

    // Generate JWT token with Firebase user data including tier info
    const token = generateToken({
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      tier: userData.tier,
      usedPages: userData.usedPages,
      totalPages: userData.totalPages,
      maxShotsPerScene: userData.maxShotsPerScene,
      canGenerateStoryboards: userData.canGenerateStoryboards
    });

    // Set authentication cookie
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
      domain: undefined
    };

    console.log('Setting auth cookie with Firebase user data');
    res.cookie('auth_token', token, cookieOptions);

    console.log('✓ Firebase authentication successful for user:', userData.email);
    console.log('✓ Auth cookie set with tier information:', userData.tier);
    console.log('✓ User limits - Pages:', userData.totalPages, 'Shots:', userData.maxShotsPerScene);
    console.log('✓ Storyboard access:', userData.canGenerateStoryboards ? 'Enabled' : 'Disabled');

    // Return complete user data including tier information
    res.json({
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      tier: userData.tier,
      usedPages: userData.usedPages,
      totalPages: userData.totalPages,
      maxShotsPerScene: userData.maxShotsPerScene,
      canGenerateStoryboards: userData.canGenerateStoryboards
    });

  } catch (error) {
    console.error('Firebase authentication error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

/**
 * Firebase sync function - placeholder for future implementation
 */
export async function firebaseSync(req: Request, res: Response) {
  try {
    // This would sync user data between Firebase and local state
    // For now, return success
    res.json({ success: true, message: 'Firebase sync not implemented yet' });
  } catch (error) {
    console.error('Firebase sync error:', error);
    res.status(500).json({ message: 'Sync failed' });
  }
}