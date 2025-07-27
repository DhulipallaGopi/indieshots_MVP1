import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/debug-auth/:email
 * Debug authentication state for a user
 */
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    console.log('🔍 DEBUG AUTH: Checking authentication state for:', email);
    
    // Get cookie token
    const cookieToken = req.cookies?.auth_token;
    
    // Get user from database
    const { storage } = await import('../storage');
    const dbUser = await storage.getUserByEmail(email);
    
    // Verify current token
    const { verifyToken } = await import('../auth/jwt');
    let tokenData = null;
    let tokenValid = false;
    
    if (cookieToken) {
      tokenData = verifyToken(cookieToken);
      tokenValid = !!tokenData;
    }
    
    const debugInfo = {
      email: email,
      hasCookieToken: !!cookieToken,
      cookieTokenPreview: cookieToken ? cookieToken.substring(0, 20) + '...' : null,
      tokenValid: tokenValid,
      tokenData: tokenData ? {
        email: tokenData.email,
        tier: tokenData.tier,
        totalPages: tokenData.totalPages,
        canGenerateStoryboards: tokenData.canGenerateStoryboards
      } : null,
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        tier: dbUser.tier,
        totalPages: dbUser.totalPages,
        canGenerateStoryboards: dbUser.canGenerateStoryboards
      } : null,
      consistency: {
        userExists: !!dbUser,
        tokenEmailMatches: tokenData?.email === email,
        tierMatches: tokenData?.tier === dbUser?.tier,
        pagesMatch: tokenData?.totalPages === dbUser?.totalPages,
        storyboardsMatch: tokenData?.canGenerateStoryboards === dbUser?.canGenerateStoryboards
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 DEBUG AUTH: Authentication state:', debugInfo);
    res.json(debugInfo);
    
  } catch (error) {
    console.error('❌ DEBUG AUTH ERROR:', error);
    res.status(500).json({ error: 'Debug check failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/debug-auth/fix-token/:email
 * Force regenerate token with correct database data
 */
router.post('/fix-token/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    console.log('🔧 DEBUG AUTH: Force fixing token for:', email);
    
    const { storage } = await import('../storage');
    const dbUser = await storage.getUserByEmail(email);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    // Generate new token with exact database values
    const { generateToken } = await import('../auth/jwt');
    const tokenPayload = {
      id: dbUser.id,
      uid: dbUser.id,
      email: dbUser.email,
      tier: dbUser.tier,
      totalPages: dbUser.totalPages,
      maxShotsPerScene: dbUser.maxShotsPerScene,
      canGenerateStoryboards: dbUser.canGenerateStoryboards,
      displayName: dbUser.displayName
    };
    
    const newToken = generateToken(tokenPayload);
    
    // Set new cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    };
    res.cookie('auth_token', newToken, cookieOptions);
    
    console.log('✅ DEBUG AUTH: Token fixed and cookie set for:', email);
    
    res.json({ 
      success: true,
      message: 'Token regenerated with database values',
      tokenPayload: tokenPayload,
      tokenPreview: newToken.substring(0, 20) + '...'
    });
    
  } catch (error) {
    console.error('❌ DEBUG AUTH FIX ERROR:', error);
    res.status(500).json({ error: 'Token fix failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;