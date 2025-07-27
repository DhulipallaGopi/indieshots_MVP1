import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * POST /api/auth-bypass/force-pro
 * Force update user to pro tier (for post-payment processing)
 */
router.post('/force-pro', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    console.log('🔧 AUTH BYPASS: Forcing pro tier for:', email);
    
    const { storage } = await import('../storage');
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Force update to pro tier with all pro features
    const proUserData = {
      ...user,
      tier: 'pro',
      totalPages: -1,
      maxShotsPerScene: -1,
      canGenerateStoryboards: true,
      paymentStatus: 'paid',
      upgradeDate: new Date().toISOString()
    };
    
    await storage.updateUser(user.id, proUserData);
    
    console.log('✅ AUTH BYPASS: User upgraded to pro tier');
    
    res.json({
      success: true,
      message: 'User upgraded to pro tier',
      user: proUserData
    });
    
  } catch (error) {
    console.error('❌ AUTH BYPASS ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to upgrade user', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/auth-bypass/user/:email
 * Get user data bypassing authentication
 */
router.get('/user/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    console.log('🔍 AUTH BYPASS: Getting user data for:', email);
    
    const { storage } = await import('../storage');
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user data with forced consistency
    const userData = {
      id: user.id,
      email: user.email,
      tier: user.tier,
      totalPages: user.tier === 'pro' ? -1 : 10,
      maxShotsPerScene: user.tier === 'pro' ? -1 : 5,
      canGenerateStoryboards: user.tier === 'pro',
      displayName: user.displayName
    };
    
    console.log('✅ AUTH BYPASS: Returning user data:', userData);
    res.json(userData);
    
  } catch (error) {
    console.error('❌ AUTH BYPASS ERROR:', error);
    res.status(500).json({ 
      error: 'Failed to get user data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;