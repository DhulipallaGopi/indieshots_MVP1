import { Request, Response, NextFunction } from 'express';

export interface TierLimits {
  free: {
    totalPages: 10;
    maxShotsPerScene: 5;
    canGenerateStoryboards: false;
  };
  pro: {
    totalPages: -1; // Unlimited
    maxShotsPerScene: -1; // Unlimited
    canGenerateStoryboards: true;
  };
}

export const TIER_LIMITS: TierLimits = {
  free: {
    totalPages: 10,
    maxShotsPerScene: 5,
    canGenerateStoryboards: false,
  },
  pro: {
    totalPages: -1, // Unlimited
    maxShotsPerScene: -1, // Unlimited  
    canGenerateStoryboards: true,
  }
};

// Middleware to check if user can access storyboard features
export const checkStoryboardAccess = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const userTier = user.tier || 'free';
  
  if (userTier === 'free') {
    return res.status(403).json({ 
      message: 'Feature requires Pro membership.',
      requiresUpgrade: true,
      feature: 'storyboards'
    });
  }
  
  next();
};

// Middleware to check page limits
export const checkPageLimit = (requestedPages: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userTier = user.tier || 'free';
    const usedPages = user.usedPages || 0;
    const totalPages = userTier === 'pro' ? -1 : TIER_LIMITS.free.totalPages;
    
    // Pro users have unlimited pages
    if (userTier === 'pro' || totalPages === -1) {
      return next();
    }
    
    if (usedPages + requestedPages > totalPages) {
      return res.status(403).json({
        message: `Page limit exceeded. You have used ${usedPages}/${totalPages} pages. Upgrade to Pro for unlimited pages.`,
        requiresUpgrade: true,
        feature: 'pages',
        currentUsage: usedPages,
        limit: totalPages
      });
    }
    
    next();
  };
};

// Middleware to check shots per scene limit
export const checkShotsLimit = (requestedShots: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userTier = user.tier || 'free';
    const maxShots = userTier === 'pro' ? -1 : TIER_LIMITS.free.maxShotsPerScene;
    
    // Pro users have unlimited shots
    if (userTier === 'pro' || maxShots === -1) {
      return next();
    }
    
    if (requestedShots > maxShots) {
      return res.status(403).json({
        message: `Shot limit exceeded. Free tier allows maximum ${maxShots} shots per scene. Upgrade to Pro for unlimited shots.`,
        requiresUpgrade: true,
        feature: 'shots',
        limit: maxShots,
        requested: requestedShots
      });
    }
    
    next();
  };
};

// Function to get user tier information
export const getUserTierInfo = (user: any) => {
  const tier = user?.tier || 'free';
  const limits = TIER_LIMITS[tier as keyof TierLimits];
  
  return {
    tier,
    totalPages: limits.totalPages,
    maxShotsPerScene: limits.maxShotsPerScene,
    canGenerateStoryboards: limits.canGenerateStoryboards,
    usedPages: user?.usedPages || 0,
  };
};