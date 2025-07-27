import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { generateToken } from '../auth/jwt';

/**
 * Middleware to automatically validate and refresh user tier information
 * This ensures users always have the correct tier access without manual intervention
 */
export const tierValidationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.email) {
      return next();
    }

    // Get fresh user data from database
    const dbUser = await storage.getUserByEmail(user.email);
    
    if (!dbUser) {
      return next();
    }

    // Check if user's tier information differs from database (any tier-related field)
    const tierMismatch = (
      user.tier !== dbUser.tier ||
      user.totalPages !== dbUser.totalPages ||
      user.maxShotsPerScene !== dbUser.maxShotsPerScene ||
      user.canGenerateStoryboards !== dbUser.canGenerateStoryboards
    );
    
    if (tierMismatch) {
      console.log(`[TIER VALIDATION] User ${user.email} tier mismatch: JWT=${user.tier}, DB=${dbUser.tier}`);
      
      // Generate new JWT token with correct tier
      const newToken = generateToken(dbUser);
      
      // Set new cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      };
      
      res.cookie('auth_token', newToken, cookieOptions);
      
      // Update request user with fresh data
      (req as any).user = {
        id: dbUser.id,
        uid: dbUser.providerId,
        email: dbUser.email,
        tier: dbUser.tier,
        totalPages: dbUser.totalPages,
        usedPages: dbUser.usedPages,
        maxShotsPerScene: dbUser.maxShotsPerScene,
        canGenerateStoryboards: dbUser.canGenerateStoryboards
      };
      
      console.log(`[TIER VALIDATION] Updated JWT token for ${user.email} with tier: ${dbUser.tier}`);
    }

    next();
  } catch (error) {
    console.error('[TIER VALIDATION] Error:', error);
    next(); // Continue even if validation fails
  }
};