import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../auth/jwt';
import { generateShotsFromScene } from '../services/shotGenerator';

const router = Router();

/**
 * POST /api/test/shot-generation
 * Test endpoint to verify shot generation is working with OpenAI API
 */
router.post('/shot-generation', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        message: 'Prompt is required'
      });
    }
    
    console.log('🎬 Testing shot generation with prompt:', prompt.substring(0, 100) + '...');
    
    // Test shot generation directly
    const shots = await generateShotsFromScene(prompt, 'Test User', 1);
    
    console.log('✅ Shot generation test completed, shots generated:', shots.length);
    
    res.json({
      success: true,
      shots: shots,
      message: `Generated ${shots.length} shots successfully`
    });
    
  } catch (error: any) {
    console.error('❌ Shot generation test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Shot generation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/test/switch-tier
 * Test endpoint to switch user tier for testing purposes
 */
router.post('/switch-tier', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;
    const user = (req as any).user;
    
    // Restrict access to premium@demo.com only
    if (user?.email !== 'premium@demo.com') {
      return res.status(403).json({
        message: 'Access denied. Test payment system is restricted to authorized users only.'
      });
    }
    
    if (!tier || (tier !== 'free' && tier !== 'pro')) {
      return res.status(400).json({
        message: 'Invalid tier. Must be "free" or "pro"'
      });
    }

    // Create new JWT token with updated tier - use existing generateToken function
    const { generateToken } = await import('../auth/jwt');
    
    const updatedUser = {
      id: user.uid || user.id,
      email: user.email,
      tier: tier,
      displayName: user.displayName || user.firstName || 'User'
    };

    const token = generateToken(updatedUser);

    // Update the user's tier in the quota database
    const { productionQuotaManager } = await import('../lib/productionQuotaManager');
    await productionQuotaManager.updateUserTier(user.uid || user.id, tier);

    // Set the new token as auth_token cookie (matches existing system)
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      message: `Successfully switched to ${tier} tier`,
      tier: tier,
      user: {
        id: user.uid || user.id,
        email: user.email,
        tier: tier
      }
    });
  } catch (error: any) {
    console.error('Error switching tier:', error);
    res.status(500).json({
      message: 'Failed to switch tier',
      error: error.message
    });
  }
});

/**
 * GET /api/test/current-tier
 * Get current user tier for testing
 */
router.get('/current-tier', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Restrict access to premium@demo.com only
    if (user?.email !== 'premium@demo.com') {
      return res.status(403).json({
        message: 'Access denied. Test payment system is restricted to authorized users only.'
      });
    }
    
    res.json({
      tier: user?.tier || 'free',
      userId: user?.uid || user?.id,
      email: user?.email
    });
  } catch (error: any) {
    console.error('Error getting current tier:', error);
    res.status(500).json({
      message: 'Failed to get current tier',
      error: error.message
    });
  }
});

/**
 * POST /api/test/reset-quota
 * Reset user quota for testing purposes
 */
router.post('/reset-quota', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.uid || user?.id;
    
    // Restrict access to premium@demo.com only
    if (user?.email !== 'premium@demo.com') {
      return res.status(403).json({
        message: 'Access denied. Test payment system is restricted to authorized users only.'
      });
    }
    
    // Import quota manager
    const { productionQuotaManager } = await import('../lib/productionQuotaManager');
    
    // Reset quota
    const updatedQuota = await productionQuotaManager.resetQuota(userId);
    
    res.json({
      success: true,
      message: 'Quota reset successfully',
      quota: updatedQuota
    });
  } catch (error: any) {
    console.error('Error resetting quota:', error);
    res.status(500).json({
      message: 'Failed to reset quota',
      error: error.message
    });
  }
});

/**
 * GET /api/test/quota-status
 * Get current quota status for testing
 */
router.get('/quota-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.uid || user?.id;
    const userTier = user?.tier || 'free';
    
    // Import quota manager
    const { productionQuotaManager } = await import('../lib/productionQuotaManager');
    
    // Get quota status
    const quota = await productionQuotaManager.getUserQuota(userId, userTier);
    
    res.json({
      quota,
      tier: userTier,
      userId: userId
    });
  } catch (error: any) {
    console.error('Error getting quota status:', error);
    res.status(500).json({
      message: 'Failed to get quota status',
      error: error.message
    });
  }
});

export default router;