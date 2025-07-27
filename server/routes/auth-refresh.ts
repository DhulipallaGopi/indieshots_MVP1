import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { storage } from '../storage';
import { generateToken } from '../auth/jwt';

const router = Router();

/**
 * POST /api/auth/refresh-tier
 * Force refresh user tier information from database
 */
router.post('/refresh-tier', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.email) {
      return res.status(400).json({ error: 'User email required' });
    }

    // Get fresh user data from database
    const dbUser = await storage.getUserByEmail(user.email);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate fresh JWT with correct tier
    const freshToken = generateToken(dbUser);
    
    // Set new cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    };
    
    res.cookie('auth_token', freshToken, cookieOptions);
    
    console.log(`[AUTH REFRESH] Updated tier for ${user.email}: ${dbUser.tier}`);
    
    // Return updated user data
    const { password, ...userData } = dbUser;
    res.json({
      ...userData,
      message: 'Tier refreshed successfully'
    });
    
  } catch (error) {
    console.error('Error refreshing tier:', error);
    res.status(500).json({ error: 'Failed to refresh tier information' });
  }
});

export default router;