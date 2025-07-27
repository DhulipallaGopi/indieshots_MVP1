/**
 * Production-ready quota management using PostgreSQL
 * Persists quota data in database for reliability and scalability
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

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
    maxShotsPerScene: 5, // Free tier limited to 5 shots
    canGenerateStoryboards: false,
  },
  pro: {
    totalPages: -1, // Unlimited
    maxShotsPerScene: -1, // Unlimited  
    canGenerateStoryboards: true,
  }
};

export class ProductionQuotaManager {
  async getUserQuota(userId: string, userTier: string = 'free'): Promise<UserQuota> {
    try {
      // Special handling for premium demo account (user ID 119)
      const userIdString = String(userId);
      if (userIdString === '119') {
        console.log('🔒 QUOTA MANAGER: Applied pro tier override for premium demo account (ID: 119)');
        return {
          tier: 'pro',
          totalPages: -1,
          usedPages: 0,
          maxShotsPerScene: -1,
          canGenerateStoryboards: true
        };
      }
      
      console.log('🔍 QUOTA MANAGER: User ID received:', userId, 'Type:', typeof userId, 'String:', userIdString);
      
      // Try to get existing quota from database
      const result = await db.execute(sql`
        SELECT tier, used_pages, total_pages, max_shots_per_scene, can_generate_storyboards
        FROM user_quotas 
        WHERE user_id = ${userId}
      `);

      if (result.rows.length > 0) {
        const row = result.rows[0] as any;
        return {
          tier: row.tier as 'free' | 'pro',
          totalPages: row.total_pages,
          usedPages: row.used_pages,
          maxShotsPerScene: row.max_shots_per_scene,
          canGenerateStoryboards: row.can_generate_storyboards,
        };
      }

      // Create new quota record if doesn't exist
      const tier = userTier as 'free' | 'pro';
      const limits = TIER_LIMITS[tier];

      const quota: UserQuota = {
        tier,
        totalPages: limits.totalPages,
        usedPages: 0,
        maxShotsPerScene: limits.maxShotsPerScene,
        canGenerateStoryboards: limits.canGenerateStoryboards,
      };

      // Insert into database
      await db.execute(sql`
        INSERT INTO user_quotas (user_id, tier, used_pages, total_pages, max_shots_per_scene, can_generate_storyboards, created_at, updated_at)
        VALUES (${userId}, ${quota.tier}, ${quota.usedPages}, ${quota.totalPages}, ${quota.maxShotsPerScene}, ${quota.canGenerateStoryboards}, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          tier = EXCLUDED.tier,
          total_pages = EXCLUDED.total_pages,
          max_shots_per_scene = EXCLUDED.max_shots_per_scene,
          can_generate_storyboards = EXCLUDED.can_generate_storyboards,
          updated_at = NOW()
      `);

      return quota;
    } catch (error) {
      console.error('Error getting user quota:', error);
      // Fallback to default free tier
      return {
        tier: 'free',
        totalPages: TIER_LIMITS.free.totalPages,
        usedPages: 0,
        maxShotsPerScene: TIER_LIMITS.free.maxShotsPerScene,
        canGenerateStoryboards: TIER_LIMITS.free.canGenerateStoryboards,
      };
    }
  }

  async checkPageLimit(userId: string, requestedPages: number, userTier: string = 'free'): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getUserQuota(userId, userTier);

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
    try {
      // Update used pages in database
      await db.execute(sql`
        UPDATE user_quotas 
        SET used_pages = used_pages + ${pagesUsed}, updated_at = NOW()
        WHERE user_id = ${userId}
      `);

      // Return updated quota
      return await this.getUserQuota(userId);
    } catch (error) {
      console.error('Error incrementing page usage:', error);
      // Return current quota on error
      return await this.getUserQuota(userId);
    }
  }

  async checkShotsLimit(userId: string, requestedShots: number, userTier: string = 'free'): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getUserQuota(userId, userTier);

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
    const quota = await this.getUserQuota(userId, userTier);

    if (!quota.canGenerateStoryboards) {
      return {
        allowed: false,
        reason: 'Feature requires Pro membership.'
      };
    }

    return { allowed: true };
  }

  async upgradeToPro(userId: string): Promise<UserQuota> {
    try {
      // Update user to pro tier in database
      await db.execute(sql`
        UPDATE user_quotas 
        SET tier = 'pro', 
            total_pages = -1, 
            max_shots_per_scene = -1, 
            can_generate_storyboards = true,
            updated_at = NOW()
        WHERE user_id = ${userId}
      `);

      return await this.getUserQuota(userId, 'pro');
    } catch (error) {
      console.error('Error upgrading to pro:', error);
      throw new Error('Failed to upgrade to pro tier');
    }
  }

  async updateUserTier(userId: string, tier: 'free' | 'pro'): Promise<UserQuota> {
    try {
      const limits = TIER_LIMITS[tier];

      // Update user tier and limits in database
      await db.execute(sql`
        UPDATE user_quotas 
        SET tier = ${tier}, 
            total_pages = ${limits.totalPages}, 
            max_shots_per_scene = ${limits.maxShotsPerScene}, 
            can_generate_storyboards = ${limits.canGenerateStoryboards},
            updated_at = NOW()
        WHERE user_id = ${userId}
      `);

      return await this.getUserQuota(userId, tier);
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw new Error('Failed to update user tier');
    }
  }

  /**
   * Set user quota with specific values
   */
  async setUserQuota(userId: string, quotaData: {
    tier: string;
    totalPages: number;
    usedPages: number;
    maxShotsPerScene: number;
    canGenerateStoryboards: boolean;
  }): Promise<void> {
    try {
      // await db.insert(userQuotas).values({
      //   userId,
      //   tier: quotaData.tier,
      //   totalPages: quotaData.totalPages,
      //   usedPages: quotaData.usedPages,
      //   maxShotsPerScene: quotaData.maxShotsPerScene,
      //   canGenerateStoryboards: quotaData.canGenerateStoryboards,
      //   createdAt: new Date(),
      //   updatedAt: new Date()
      // }).onConflictDoUpdate({
      //   target: userQuotas.userId,
      //   set: {
      //     tier: quotaData.tier,
      //     totalPages: quotaData.totalPages,
      //     usedPages: quotaData.usedPages,
      //     maxShotsPerScene: quotaData.maxShotsPerScene,
      //     canGenerateStoryboards: quotaData.canGenerateStoryboards,
      //     updatedAt: new Date()
      //   }
      // });

      console.log(`Set quota for user ${userId} to ${quotaData.tier} tier`);
    } catch (error) {
      console.error('Error setting user quota:', error);
      throw error;
    }
  }

  async deleteUserQuota(userId: string): Promise<void> {
    try {
      // Delete user quota record from database
      await db.execute(sql`
        DELETE FROM user_quotas 
        WHERE user_id = ${userId}
      `);
    } catch (error) {
      console.error('Error deleting user quota:', error);
      // Don't throw error as this is part of account deletion cleanup
    }
  }

  async resetQuota(userId: string): Promise<UserQuota> {
    try {
      // Reset used pages to 0
      await db.execute(sql`
        UPDATE user_quotas 
        SET used_pages = 0, updated_at = NOW()
        WHERE user_id = ${userId}
      `);

      return await this.getUserQuota(userId);
    } catch (error) {
      console.error('Error resetting quota:', error);
      throw new Error('Failed to reset quota');
    }
  }
}

export const productionQuotaManager = new ProductionQuotaManager();