import { Router, Request, Response } from 'express';
import passport from 'passport';
import { authMiddleware, generateToken } from '../auth/jwt';
import { storage } from '../storage';
import * as authController from '../controllers/authController';
import * as otpController from '../controllers/otpController';
import * as hybridAuthController from '../controllers/firebaseHybridAuthController';
import { firebaseLogin } from '../controllers/firebaseAuthController';
import { syncFirebaseUser } from '../controllers/firebaseSyncController.simple';
import { tierValidationMiddleware } from '../middleware/tierValidation';

const router = Router();

// Google OAuth routes (disabled for now - using Firebase for Google auth)
// router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
// router.get('/google/callback', 
//   passport.authenticate('google', { failureRedirect: '/auth' }), 
//   (req, res) => res.redirect('/')
// );

// GitHub OAuth routes (disabled for now)
// router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
// router.get('/github/callback', 
//   passport.authenticate('github', { failureRedirect: '/auth' }), 
//   (req, res) => res.redirect('/')
// );

// Firebase-first hybrid authentication routes
router.post('/hybrid-signup', hybridAuthController.hybridSignup);
router.post('/hybrid-signin', hybridAuthController.hybridSignin);  
router.post('/hybrid-verify-otp', hybridAuthController.hybridVerifyOTP);
router.post('/hybrid-resend-otp', hybridAuthController.hybridResendOTP);

// Legacy authentication routes - CSRF protection disabled for development  
router.post('/signup', otpController.registerWithOTP);
router.post('/send-otp', otpController.registerWithOTP); // Alias for signup
router.post('/verify-email', otpController.verifyOTP);
router.post('/resend-otp', otpController.resendOTP);
router.post('/signin', authController.login);
router.post('/magic-link', authController.sendMagicLink);
router.get('/magic-link/verify', authController.verifyMagicLink);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

// Get current authenticated user with fresh tier information  
router.get('/user', authMiddleware, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).user;
    
    if (!jwtUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`[AUTH] Getting user data for: ${jwtUser.email}`);
    console.log(`[AUTH] JWT user tier: ${jwtUser.tier}`);

    // Return JWT user data directly without hardcoded premium demo overrides
    const userData = {
      id: jwtUser.id || jwtUser.uid,
      uid: jwtUser.uid || jwtUser.id,
      email: jwtUser.email,
      displayName: jwtUser.displayName || jwtUser.email?.split('@')[0],
      tier: jwtUser.tier || 'free',
      totalPages: jwtUser.totalPages || (jwtUser.tier === 'pro' ? -1 : 10),
      usedPages: jwtUser.usedPages || 0,
      maxShotsPerScene: jwtUser.maxShotsPerScene || (jwtUser.tier === 'pro' ? -1 : 5),
      canGenerateStoryboards: jwtUser.canGenerateStoryboards !== undefined ? jwtUser.canGenerateStoryboards : (jwtUser.tier === 'pro')
    };

    console.log(`[AUTH] Returning user data - Tier: ${userData.tier}, CanGenerateStoryboards: ${userData.canGenerateStoryboards}`);
    res.json(userData);
  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Debug endpoint to check JWT token contents
router.get('/debug-token', authMiddleware, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).user;
    
    console.log('[DEBUG] Full JWT user object:', JSON.stringify(jwtUser, null, 2));
    
    res.json({
      jwtUser: jwtUser,
      currentTier: jwtUser?.tier,
      canGenerateStoryboards: jwtUser?.canGenerateStoryboards,
      totalPages: jwtUser?.totalPages,
      maxShotsPerScene: jwtUser?.maxShotsPerScene,
      email: jwtUser?.email
    });
  } catch (error) {
    console.error('Debug token error:', error);
    res.status(500).json({ error: 'Failed to debug token' });
  }
});

// Refresh user session with updated tier information
router.post('/refresh-session', authMiddleware, async (req: Request, res: Response) => {
  try {
    const jwtUser = (req as any).user;
    
    if (!jwtUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get fresh user data from database
    let user;
    
    // Try to get user by Firebase UID first (for promo code users)
    if (jwtUser.uid) {
      user = await storage.getUserByProviderId('firebase', jwtUser.uid);
    }
    
    // Fallback to email lookup
    if (!user && jwtUser.email) {
      user = await storage.getUserByEmail(jwtUser.email);
    }
    
    // Fallback to ID lookup
    if (!user && jwtUser.id) {
      user = await storage.getUser(jwtUser.id);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new JWT token with fresh tier information
    const userData = {
      id: user.id,
      uid: user.providerId || jwtUser.uid,
      email: user.email,
      displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || jwtUser.displayName,
      tier: user.tier || 'free',
      totalPages: user.tier === 'pro' ? -1 : 10,
      usedPages: user.usedPages || 0,
      maxShotsPerScene: user.tier === 'pro' ? -1 : 5,
      canGenerateStoryboards: user.tier === 'pro'
    };

    const newToken = generateToken(userData);

    // Set new auth cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    console.log(`[AUTH] Session refreshed for ${user.email} with tier: ${user.tier}`);
    res.json({
      message: 'Session refreshed successfully',
      user: userData
    });
  } catch (error) {
    console.error('Error refreshing session:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});

// Test endpoint to verify server is processing changes  
router.get('/test', (req: Request, res: Response) => {
  console.log('🧪 Test endpoint called - server is processing changes');
  return res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

// Test OpenAI API key endpoint
router.get('/test-openai', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not found' });
    }
    
    // Test the API key with a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      res.json({ 
        success: true, 
        message: 'OpenAI API key is valid',
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10) + '...'
      });
    } else {
      const error = await response.json();
      res.status(response.status).json({ 
        success: false, 
        error: error.error?.message || 'API key validation failed',
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 10) + '...'
      });
    }
    
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      keyExists: !!process.env.OPENAI_API_KEY
    });
  }
});

// Test Firebase connectivity
router.get('/test-firebase', async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testing Firebase Admin connectivity...');
    
    // Import Firebase Admin directly
    const admin = await import('firebase-admin');
    const firebaseAdmin = admin.default;
    
    // Check if Firebase is initialized
    if (!firebaseAdmin.apps.length) {
      return res.json({ firebase: 'error', message: 'Firebase not initialized' });
    }
    
    // Try to check if a dummy user exists (should return user-not-found)
    try {
      await firebaseAdmin.auth().getUserByEmail('test-nonexistent@example.com');
      return res.json({ firebase: 'working', message: 'Firebase Admin SDK is working' });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.json({ firebase: 'working', message: 'Firebase Admin SDK is working' });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Firebase test error:', error);
    return res.status(500).json({ firebase: 'error', message: error.message });
  }
});

// Test Firebase user deletion (debugging endpoint)
router.post('/test-firebase-delete', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log('🧪 Testing Firebase user deletion for:', email);
    
    // Use direct Firebase Admin import
    const admin = await import('firebase-admin');
    const firebaseAdmin = admin.default;
    
    if (!firebaseAdmin.apps.length) {
      return res.json({ firebase: 'error', message: 'Firebase not initialized' });
    }
    
    // First, try to get the user to verify they exist
    let userRecord;
    try {
      userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      console.log('Found user in Firebase:', userRecord.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.json({ message: 'User not found in Firebase', email });
      }
      throw error;
    }
    
    // Now try to delete the user
    try {
      await firebaseAdmin.auth().deleteUser(userRecord.uid);
      console.log('Successfully deleted user from Firebase:', email);
      
      // Verify deletion by trying to get the user again
      try {
        await firebaseAdmin.auth().getUserByEmail(email);
        return res.json({ message: 'ERROR: User still exists after deletion!', email });
      } catch (verifyError: any) {
        if (verifyError.code === 'auth/user-not-found') {
          return res.json({ message: 'SUCCESS: User completely deleted from Firebase', email });
        }
        throw verifyError;
      }
    } catch (deleteError: any) {
      console.error('Error deleting user from Firebase:', deleteError);
      return res.status(500).json({ message: 'Failed to delete user from Firebase', error: deleteError.message });
    }
    
  } catch (error: any) {
    console.error('Firebase delete test error:', error);
    return res.status(500).json({ message: 'Test failed', error: error.message });
  }
});

// Debug user data endpoint
router.get('/debug-user-data', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Debug user data:', user);
    
    // Also check PostgreSQL user data
    const { storage } = await import('../storage');
    let pgUser = null;
    try {
      pgUser = await storage.getUserByProviderId('firebase', user.id);
      console.log('PostgreSQL user found:', !!pgUser);
    } catch (error) {
      console.log('PostgreSQL user not found:', error);
    }
    
    // Check Firebase user data
    let firebaseUser = null;
    try {
      const { deleteFirebaseUser } = await import('../utils/firebaseUserDeletion.js');
      const admin = await import('firebase-admin');
      const firebaseAdmin = admin.default;
      
      if (firebaseAdmin.apps.length > 0) {
        try {
          firebaseUser = await firebaseAdmin.auth().getUserByEmail(user.email);
        } catch (error: any) {
          if (error.code !== 'auth/user-not-found') {
            console.error('Firebase user lookup error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Firebase check error:', error);
    }
    
    res.json({
      jwtUser: user,
      pgUser: pgUser,
      firebaseUser: firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        disabled: firebaseUser.disabled
      } : null,
      firebaseUID: user.providerId || user.id,
      email: user.email
    });
  } catch (error: any) {
    console.error('Debug user data error:', error);
    res.status(500).json({ message: 'Debug failed', error: error.message });
  }
});

// Test Firebase user deletion endpoint with comprehensive logging
router.post('/test-comprehensive-firebase-delete', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const { deleteFirebaseUser } = await import('../utils/firebaseUserDeletion.js');
    
    console.log('🧪 Testing comprehensive Firebase user deletion...');
    const result = await deleteFirebaseUser(email);
    
    res.json({
      email,
      result,
      success: result.success && result.verified
    });
    
  } catch (error: any) {
    console.error('Test comprehensive Firebase delete error:', error);
    res.status(500).json({ message: 'Test failed', error: error.message });
  }
});

// REMOVED: Duplicate endpoint - using the correct one below

// Firebase authentication - no CSRF needed (uses Firebase idToken)
router.post('/firebase-login', firebaseLogin);
router.post('/firebase-sync', syncFirebaseUser);

// Get currently authenticated user (Firebase-only) with fresh tier data
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const tokenUser = (req as any).user;
    if (!tokenUser) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Import quota manager to get current tier from database
    const { ProductionQuotaManager } = await import('../lib/productionQuotaManager');
    const quotaManager = new ProductionQuotaManager();
    
    // Get fresh tier information from PostgreSQL using Firebase UID
    const userQuota = await quotaManager.getUserQuota(tokenUser.id, tokenUser.tier);
    
    // Special handling for premium demo account
    const isPremiumDemo = tokenUser.email === 'premium@demo.com';
    
    // Return user data with fresh tier information from PostgreSQL database
    const userData = {
      id: tokenUser.id,
      email: tokenUser.email,
      displayName: tokenUser.displayName,
      photoURL: tokenUser.photoURL,
      tier: isPremiumDemo ? 'pro' : userQuota.tier,
      usedPages: userQuota.usedPages,
      totalPages: isPremiumDemo ? -1 : userQuota.totalPages,
      maxShotsPerScene: isPremiumDemo ? -1 : userQuota.maxShotsPerScene,
      canGenerateStoryboards: isPremiumDemo ? true : userQuota.canGenerateStoryboards
    };
    
    if (isPremiumDemo) {
      console.log('🔒 QUOTA USER ENDPOINT: Applied pro tier override for premium@demo.com');
    }
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching Firebase user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Refresh user tier from database
router.get('/refresh-tier', authMiddleware, async (req, res) => {
  try {
    const tokenUser = (req as any).user;
    if (!tokenUser) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    console.log('Refreshing tier for user:', tokenUser.email);
    
    // Import quota manager to get current tier from database
    const { ProductionQuotaManager } = await import('../lib/productionQuotaManager');
    const quotaManager = new ProductionQuotaManager();
    
    // Get fresh tier information from PostgreSQL
    const userQuota = await quotaManager.getUserQuota(tokenUser.id);
    
    console.log('Fresh tier data from database:', userQuota);
    
    res.json({
      tier: userQuota.tier,
      usedPages: userQuota.usedPages,
      totalPages: userQuota.totalPages,
      maxShotsPerScene: userQuota.maxShotsPerScene,
      canGenerateStoryboards: userQuota.canGenerateStoryboards
    });
  } catch (error) {
    console.error('Error refreshing tier:', error);
    res.status(500).json({ message: 'Failed to refresh tier' });
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ message: 'Preferences data required' });
    }

    const { storage } = await import('../storage');
    const updatedUser = await storage.updateUserPreferences(user.id, preferences);
    
    // Return updated user data (excluding sensitive fields)
    const { password, ...userData } = updatedUser;
    res.json({
      ...userData,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Failed to update preferences' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { firstName, lastName, email } = req.body;
    
    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update data provided' });
    }

    const { storage } = await import('../storage');
    const updatedUser = await storage.updateUser(user.id, updates);
    
    // Return updated user data (excluding sensitive fields)
    const { password, ...userData } = updatedUser;
    res.json({
      ...userData,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Update user profile - requires authentication (CSRF disabled for development)
router.put('/user', authMiddleware, authController.updateProfile);

// Change password - requires authentication (CSRF disabled for development)
router.post('/change-password', authMiddleware, authController.changePassword);

// Verify email
router.get('/verify-email', authController.verifyEmail);

// Schedule account for deletion (30 days) - requires authentication
router.post('/schedule-delete-account', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Scheduling account deletion for user:', user.email);

    const { storage } = await import('../storage');
    
    // Schedule user for deletion in 30 days
    await storage.scheduleUserDeletion(user.id);
    
    console.log('Account scheduled for deletion for user:', user.email);
    
    res.json({ 
      message: 'Account scheduled for deletion in 30 days. You can restore it by logging in again.',
      success: true 
    });
  } catch (error) {
    console.error('Error scheduling account deletion:', error);
    res.status(500).json({ 
      message: 'Failed to schedule account deletion. Please contact support if this problem persists.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Permanently delete account immediately - requires authentication
router.delete('/delete-account-permanent', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Permanently deleting account for user:', user.email);
    console.log('User object keys:', Object.keys(user));
    console.log('User ID:', user.id);
    console.log('User providerId:', user.providerId);
    console.log('User email:', user.email);

    // Delete all user data from database
    const { storage } = await import('../storage');
    
    // Delete in proper order to respect foreign key constraints
    // 1. First get all user's scripts
    const userScripts = await storage.getUserScripts(user.id);
    
    // 2. For each script, delete its parse jobs first (which will cascade to delete shots)
    for (const script of userScripts) {
      await storage.deleteParseJobsForScript(script.id);
    }
    
    // 3. Then delete the scripts (now safe since parse jobs are gone)
    for (const script of userScripts) {
      await storage.deleteScript(script.id);
    }
    
    // Delete user quota record
    const { ProductionQuotaManager } = await import('../lib/productionQuotaManager');
    const quotaManager = new ProductionQuotaManager();
    await quotaManager.deleteUserQuota(user.id);
    
    // Delete promo code usage records for this user
    try {
      const { PromoCodeService } = await import('../services/promoCodeService');
      await PromoCodeService.deleteUserPromoCodeUsage(user.email);
      console.log('Deleted promo code usage records for user:', user.email);
    } catch (error) {
      console.log('No promo code usage records found for user:', user.email);
    }
    
    // Delete any script health analysis records
    try {
      await storage.deleteScriptHealthAnalysisForUser(user.id);
      console.log('Deleted script health analysis records for user:', user.email);
    } catch (error) {
      console.log('No script health analysis records found for user:', user.email);
    }
    
    // Delete any session records for this user
    try {
      await storage.deleteUserSessions(user.id);
      console.log('Deleted session records for user:', user.email);
    } catch (error) {
      console.log('No session records found for user:', user.email);
    }
    
    // Delete user from Firebase using comprehensive deletion utility
    try {
      const { deleteFirebaseUser } = await import('../utils/firebaseUserDeletion.js');
      
      console.log('🔥 Initiating comprehensive Firebase user deletion...');
      const deletionResult = await deleteFirebaseUser(user.email, user.providerId);
      
      if (deletionResult.success) {
        console.log(`🔥 Firebase user deletion SUCCESS:`, {
          method: deletionResult.method,
          firebaseUID: deletionResult.firebaseUID,
          verified: deletionResult.verified
        });
        
        if (!deletionResult.verified) {
          console.error('🔥 WARNING: Firebase deletion completed but verification failed!');
        }
      } else {
        console.error('🔥 Firebase user deletion FAILED:', deletionResult.error);
      }
      
    } catch (error: any) {
      console.error('🔥 Error during Firebase deletion process:', error.message);
    }
    
    // Blacklist the user from signing back in (backup protection)
    const { tokenBlacklist } = await import('../auth/tokenBlacklist');
    
    // Add user ID to permanent blacklist to prevent any future sign-ins
    tokenBlacklist.addPermanentUserBan(user.id, user.email);
    console.log('User permanently banned from signing in:', user.email);
    
    // Finally delete the user account from database
    await storage.deleteUser(user.id);
    
    console.log('Account permanently deleted for user:', user.email);
    
    // Clear the authentication cookie and invalidate session
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.json({ 
      message: 'Account permanently deleted successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error permanently deleting account:', error);
    res.status(500).json({ 
      message: 'Failed to delete account. Please contact support if this problem persists.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup orphaned Firebase user that exists in Firebase but not in PostgreSQL
router.post('/cleanup-orphaned-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    console.log('Cleaning up orphaned Firebase user:', email);

    // Check if user exists in PostgreSQL
    const { storage } = await import('../storage');
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User exists in database. Use normal deletion process.' 
      });
    }

    // Try to delete from Firebase using admin SDK
    try {
      const admin = await import('firebase-admin');
      
      // Get user by email from Firebase
      const userRecord = await admin.auth().getUserByEmail(email);
      
      if (userRecord) {
        // Delete from Firebase
        await admin.auth().deleteUser(userRecord.uid);
        console.log('Successfully deleted Firebase user:', email);
        
        res.json({ 
          message: 'Firebase user cleaned up successfully. You can now register with this email.',
          success: true 
        });
      } else {
        res.status(404).json({ 
          message: 'User not found in Firebase either. Email should be available for registration.',
          success: true
        });
      }
      
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/user-not-found') {
        res.json({ 
          message: 'User not found in Firebase. Email should be available for registration.',
          success: true
        });
      } else {
        console.error('Firebase cleanup error:', firebaseError);
        res.status(500).json({ 
          message: 'Could not clean up Firebase user. Please contact support.',
          error: firebaseError.message 
        });
      }
    }
    
  } catch (error) {
    console.error('Error cleaning up orphaned user:', error);
    res.status(500).json({ 
      message: 'Failed to cleanup user. Please contact support.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cancel scheduled deletion - requires authentication
router.post('/cancel-delete-account', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Cancelling scheduled deletion for user:', user.email);

    const { storage } = await import('../storage');
    
    // Cancel scheduled deletion
    await storage.cancelUserDeletion(user.id);
    
    console.log('Scheduled deletion cancelled for user:', user.email);
    
    res.json({ 
      message: 'Account deletion cancelled successfully',
      success: true 
    });
  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    res.status(500).json({ 
      message: 'Failed to cancel account deletion. Please contact support if this problem persists.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export user data - requires authentication
router.get('/export-data', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Exporting data for user:', user.email);

    const { storage } = await import('../storage');

    // Helper function to convert data to CSV format
    const convertToCSV = (data: any[]) => {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return '"' + value.replace(/"/g, '""') + '"';
          }
          return value || '';
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    };

    // Get all user's data
    const userScripts = await storage.getUserScripts(user.id);
    const userParseJobs = await storage.getUserParseJobs(user.id);
    
    // Get all shots
    const allShots = [];
    for (const job of userParseJobs) {
      const jobShots = await storage.getShotsByParseJobId(job.id);
      allShots.push(...jobShots);
    }

    // Create user profile CSV
    const userProfileData = [{
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      tier: user.tier,
      createdAt: user.createdAt,
      preferences: JSON.stringify(user.preferences || {})
    }];

    // Create scripts metadata CSV
    const scriptsData = userScripts.map(script => ({
      id: script.id,
      title: script.title,
      fileType: script.fileType || 'unknown',
      fileSize: script.fileSize || 0,
      pageCount: script.pageCount || 0,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt
    }));

    // Create parse jobs CSV
    const parseJobsData = userParseJobs.map(job => ({
      id: job.id,
      scriptId: job.scriptId,
      status: job.status,
      selectedColumns: Array.isArray(job.selectedColumns) ? job.selectedColumns.join(';') : '',
      errorMessage: job.errorMessage || '',
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt || ''
    }));

    // Create shots CSV
    const shotsData = allShots.map(shot => ({
      id: shot.id,
      parseJobId: shot.parseJobId,
      sceneIndex: shot.sceneIndex,
      shotNumberInScene: shot.shotNumberInScene,
      displayShotNumber: shot.displayShotNumber || '',
      shotDescription: shot.shotDescription || '',
      shotType: shot.shotType || '',
      lens: shot.lens || '',
      movement: shot.movement || '',
      sceneHeading: shot.sceneHeading || '',
      location: shot.location || '',
      timeOfDay: shot.timeOfDay || '',
      characters: shot.characters || '',
      action: shot.action || '',
      dialogue: shot.dialogue || '',
      props: shot.props || '',
      tone: shot.tone || '',
      moodAndAmbience: shot.moodAndAmbience || '',
      lighting: shot.lighting || '',
      notes: shot.notes || '',
      soundDesign: shot.soundDesign || '',
      colourTemp: shot.colourTemp || '',
      imagePromptText: shot.imagePromptText || '',
      hasImage: !!shot.imageData,
      createdAt: shot.createdAt,
      updatedAt: shot.updatedAt
    }));

    // Create README content
    const readmeContent = `IndieShots Data Export
=====================

This export contains all your data from IndieShots:

1. user-profile.csv - Your account information and preferences
2. scripts-metadata.csv - Information about your uploaded scripts (${scriptsData.length} scripts)
3. parse-jobs.csv - History of your script parsing jobs (${parseJobsData.length} jobs)
4. shots.csv - All generated shots from your scripts (${shotsData.length} shots)
5. scripts-content.csv - Full text content of your scripts

Export Date: ${new Date().toISOString()}
User: ${user.email}
Export Version: 2.0

For questions about this export, contact: indieshots@theindierise.com
`;

    // Create scripts content CSV (includes full text content)
    const scriptsContentData = userScripts.map(script => ({
      id: script.id,
      title: script.title,
      content: script.content || '',
      fileType: script.fileType || 'unknown',
      createdAt: script.createdAt
    }));

    // Prepare all data as a single JSON response with embedded CSV data
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        userEmail: user.email,
        totalScripts: scriptsData.length,
        totalParseJobs: parseJobsData.length,
        totalShots: shotsData.length
      },
      csvFiles: {
        'user-profile.csv': convertToCSV(userProfileData),
        'scripts-metadata.csv': convertToCSV(scriptsData),
        'scripts-content.csv': convertToCSV(scriptsContentData),
        'parse-jobs.csv': convertToCSV(parseJobsData),
        'shots.csv': convertToCSV(shotsData),
        'README.txt': readmeContent
      }
    };

    console.log(`Data export completed for user ${user.email}: ${scriptsData.length} scripts, ${parseJobsData.length} parse jobs, ${shotsData.length} shots`);

    // Set response headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="indieshots-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`);
    
    // Send the data as JSON
    res.json(exportData);

  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ 
      message: 'Failed to export data. Please contact support if this problem persists.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;