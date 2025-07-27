import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * GET /api/post-payment/status/:email
 * Get user tier status directly by email - bypasses all authentication for post-payment checks
 */
router.get('/status/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter required' });
    }
    
    console.log('🔍 POST-PAYMENT STATUS: Checking user:', email);
    
    // Direct database access
    const { storage } = await import('../storage');
    const dbUser = await storage.getUserByEmail(email);
    
    if (!dbUser) {
      console.log('❌ POST-PAYMENT STATUS: User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Calculate used pages
    const { db } = await import('../db');
    const { scripts } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const userScripts = await db.select()
      .from(scripts)
      .where(eq(scripts.userId, String(dbUser.id)));
    
    const usedPages = userScripts.reduce((total, script) => {
      return total + (script.pageCount || 0);
    }, 0);
    
    const response = {
      tier: dbUser.tier || 'free',
      limits: {
        tier: dbUser.tier || 'free',
        totalPages: dbUser.totalPages || (dbUser.tier === 'pro' ? -1 : 10),
        usedPages: usedPages,
        maxShotsPerScene: dbUser.maxShotsPerScene || (dbUser.tier === 'pro' ? -1 : 5),
        canGenerateStoryboards: dbUser.canGenerateStoryboards !== undefined ? dbUser.canGenerateStoryboards : (dbUser.tier === 'pro')
      },
      isPro: dbUser.tier === 'pro',
      hasUnlimitedAccess: dbUser.totalPages === -1,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ POST-PAYMENT STATUS: Response for', email, ':', response);
    
    // Disable caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ POST-PAYMENT STATUS ERROR:', error);
    res.status(500).json({ error: 'Failed to get post-payment status' });
  }
});

export default router;