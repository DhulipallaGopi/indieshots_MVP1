import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * POST /api/force-refresh/:email
 * Force refresh authentication for user with database consistency check
 */
router.post('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    console.log('🔄 FORCE REFRESH: Starting comprehensive refresh for:', email);
    
    const { storage } = await import('../storage');
    const dbUser = await storage.getUserByEmail(email);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('📊 FORCE REFRESH: Database user data:', {
      tier: dbUser.tier,
      totalPages: dbUser.totalPages,
      canGenerateStoryboards: dbUser.canGenerateStoryboards
    });
    
    // Generate completely fresh token with exact database values
    const { generateToken } = await import('../auth/jwt');
    const tokenPayload = {
      id: dbUser.id,
      uid: dbUser.id,
      email: dbUser.email,
      tier: dbUser.tier || 'free',
      totalPages: dbUser.totalPages !== undefined ? dbUser.totalPages : (dbUser.tier === 'pro' ? -1 : 10),
      maxShotsPerScene: dbUser.maxShotsPerScene || (dbUser.tier === 'pro' ? -1 : 5),
      canGenerateStoryboards: dbUser.canGenerateStoryboards !== undefined ? dbUser.canGenerateStoryboards : (dbUser.tier === 'pro'),
      displayName: dbUser.displayName
    };
    
    const freshToken = generateToken(tokenPayload);
    
    // Force new cookie with extended expiration
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    };
    res.cookie('auth_token', freshToken, cookieOptions);
    
    // Verify the new token immediately
    const { verifyToken } = await import('../auth/jwt');
    const verifiedToken = verifyToken(freshToken);
    
    console.log('✅ FORCE REFRESH: Token generated and verified for:', email);
    console.log('🔍 FORCE REFRESH: Token payload:', tokenPayload);
    console.log('✅ FORCE REFRESH: Token verification result:', !!verifiedToken);
    
    res.json({
      success: true,
      message: 'Authentication forcefully refreshed',
      user: tokenPayload,
      tokenValid: !!verifiedToken,
      refreshTimestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ FORCE REFRESH ERROR:', error);
    res.status(500).json({ 
      error: 'Force refresh failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;