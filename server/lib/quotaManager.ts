/**
 * Simple JWT-based quota management for Firebase-only authentication
 * This avoids Firebase Admin SDK issues in Replit environment
 */

export interface UserQuota {
  tier: 'free' | 'pro';
  totalPages: number;
  usedPages: number;
  maxShotsPerScene: number;
  canGenerateStoryboards: boolean;
}

export const TIER_LIMITS = {
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

// In-memory quota tracking (in production, use Redis or database)
const userQuotas = new Map<string, UserQuota>();

export class QuotaManager {
  getUserQuota(userId: string, userTier: string = 'free'): UserQuota {
    if (!userQuotas.has(userId)) {
      // Initialize new user with default quota
      const tier = userTier as 'free' | 'pro';
      const limits = TIER_LIMITS[tier];
      
      const quota: UserQuota = {
        tier,
        totalPages: limits.totalPages,
        usedPages: 0,
        maxShotsPerScene: limits.maxShotsPerScene,
        canGenerateStoryboards: limits.canGenerateStoryboards,
      };
      
      userQuotas.set(userId, quota);
      return quota;
    }
    
    return userQuotas.get(userId)!;
  }

  async checkPageLimit(userId: string, requestedPages: number, userTier: string = 'free'): Promise<{ allowed: boolean; reason?: string }> {
    const quota = this.getUserQuota(userId, userTier);
    
    // Pro users have unlimited pages
    if (quota.tier === 'pro' || quota.totalPages === -1) {
      return { allowed: true };
    }

    if (quota.usedPages + requestedPages > quota.totalPages) {
      return {
        allowed: false,
        reason: `Page limit exceeded. You have used ${quota.usedPages}/${quota.totalPages} pages. Upgrade to Pro for unlimited pages.`
      };
    }

    return { allowed: true };
  }

  async incrementPageUsage(userId: string, pagesUsed: number): Promise<UserQuota> {
    const quota = this.getUserQuota(userId);
    quota.usedPages = (quota.usedPages || 0) + pagesUsed;
    userQuotas.set(userId, quota);
    return quota;
  }

  async checkShotsLimit(userId: string, requestedShots: number, userTier: string = 'free'): Promise<{ allowed: boolean; reason?: string }> {
    const quota = this.getUserQuota(userId, userTier);
    
    // Pro users have unlimited shots
    if (quota.tier === 'pro' || quota.maxShotsPerScene === -1) {
      return { allowed: true };
    }

    if (requestedShots > quota.maxShotsPerScene) {
      return {
        allowed: false,
        reason: `Shot limit exceeded. Free tier allows maximum ${quota.maxShotsPerScene} shots per scene. Upgrade to Pro for unlimited shots.`
      };
    }

    return { allowed: true };
  }

  async checkStoryboardAccess(userId: string, userTier: string = 'free'): Promise<{ allowed: boolean; reason?: string }> {
    const quota = this.getUserQuota(userId, userTier);
    
    if (!quota.canGenerateStoryboards) {
      return {
        allowed: false,
        reason: 'Feature requires Pro membership.'
      };
    }

    return { allowed: true };
  }

  // Upgrade user to pro tier
  async upgradeToPro(userId: string): Promise<UserQuota> {
    const quota: UserQuota = {
      tier: 'pro',
      totalPages: TIER_LIMITS.pro.totalPages,
      usedPages: 0, // Reset usage on upgrade
      maxShotsPerScene: TIER_LIMITS.pro.maxShotsPerScene,
      canGenerateStoryboards: TIER_LIMITS.pro.canGenerateStoryboards,
    };
    
    userQuotas.set(userId, quota);
    return quota;
  }
}

export const quotaManager = new QuotaManager();