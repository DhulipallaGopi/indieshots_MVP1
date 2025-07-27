import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/simple-status/:email
 * Simple status check without authentication for post-payment debugging
 */
router.get('/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    console.log('🔍 SIMPLE STATUS: Checking user:', email);
    
    const { storage } = await import('../storage');
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.json({ found: false, email });
    }
    
    const response = {
      found: true,
      email: user.email,
      tier: user.tier || 'free',
      totalPages: user.totalPages,
      canGenerateStoryboards: user.canGenerateStoryboards,
      isPro: user.tier === 'pro',
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ SIMPLE STATUS: Response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('❌ SIMPLE STATUS ERROR:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

export default router;