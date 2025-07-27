import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth/jwt';
import { storage } from '../storage';

const router = Router();

// Test endpoint to verify premium@demo.com account status
router.get('/premium-demo-status', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByEmail('premium@demo.com');
    
    if (!user) {
      return res.json({ 
        message: 'premium@demo.com not found in database',
        status: 'not_found' 
      });
    }
    
    const status = {
      email: user.email,
      tier: user.tier,
      totalPages: user.totalPages,
      maxShotsPerScene: user.maxShotsPerScene,
      canGenerateStoryboards: user.canGenerateStoryboards,
      updatedAt: user.updatedAt,
      status: user.tier === 'pro' ? 'PRO_ACCOUNT' : 'FREE_ACCOUNT',
      features: {
        unlimitedPages: user.totalPages === -1,
        unlimitedShots: user.maxShotsPerScene === -1,
        storyboardGeneration: user.canGenerateStoryboards
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error checking premium demo status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Test endpoint to simulate a complete signin flow
router.post('/test-signin-flow', async (req: Request, res: Response) => {
  try {
    // Step 1: Simulate Firebase sync
    const syncResponse = await fetch('http://localhost:5000/api/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firebaseUser: {
          uid: "WbrPQSqy29Q1BnvKpmOvJZIMnZI2", 
          email: "premium@demo.com",
          displayName: "Premium Demo",
          emailVerified: true
        },
        provider: "password"
      })
    });
    
    const syncData = await syncResponse.json();
    
    res.json({
      message: 'Complete signin flow test',
      firebaseSync: {
        tier: syncData.tier,
        totalPages: syncData.totalPages,
        maxShotsPerScene: syncData.maxShotsPerScene,
        canGenerateStoryboards: syncData.canGenerateStoryboards
      },
      isPro: syncData.tier === 'pro',
      allFeatures: syncData.tier === 'pro' && 
                  syncData.totalPages === -1 && 
                  syncData.maxShotsPerScene === -1 && 
                  syncData.canGenerateStoryboards === true
    });
  } catch (error) {
    console.error('Error testing signin flow:', error);
    res.status(500).json({ error: 'Failed to test signin flow' });
  }
});

export default router;