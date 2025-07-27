import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth/jwt';
import { storage } from '../storage';

const router = Router();

// Basic healthcheck endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to verify premium@demo.com status
router.get('/debug/premium-demo-status', async (req: Request, res: Response) => {
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

// Login page redirect - send HTML redirect to auth page
router.get('/login', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="0; url=/auth">
        <script>window.location.href = '/auth';</script>
      </head>
      <body>
        <p>Redirecting to login page...</p>
      </body>
    </html>
  `);
});

// Logout page redirect - clear session and redirect to home
router.get('/logout', (req: Request, res: Response) => {
  // Clear auth cookie
  res.clearCookie('auth_token');
  
  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="2; url=/">
        <script>
          // Clear any client-side auth data
          localStorage.clear();
          sessionStorage.clear();
          
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        </script>
      </head>
      <body>
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>Logging out...</h2>
          <p>You have been successfully logged out.</p>
          <p>Redirecting to home page...</p>
        </div>
      </body>
    </html>
  `);
});

// This endpoint has been moved to /api/auth/user with proper authentication

export default router;