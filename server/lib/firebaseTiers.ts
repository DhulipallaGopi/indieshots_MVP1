import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  // For development, we'll use a simplified approach
  // In production, you'd use proper service account credentials
  try {
    initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'indieshots-c6bb1',
    });
  } catch (error) {
    console.warn('Firebase Admin initialization failed, using client-side only approach');
  }
}

export interface UserTier {
  tier: 'free' | 'pro';
  totalPages: number;
  usedPages: number;
  maxShotsPerScene: number;
  canGenerateStoryboards: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

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

export class FirebaseTierManager {
  private auth = getAuth();
  private db = getFirestore();

  async getUserTier(firebaseUid: string): Promise<UserTier> {
    try {
      const userDoc = await this.db.collection('users').doc(firebaseUid).get();
      
      if (!userDoc.exists) {
        // Create default free tier user
        const defaultTier: UserTier = {
          tier: 'free',
          totalPages: TIER_LIMITS.free.totalPages,
          usedPages: 0,
          maxShotsPerScene: TIER_LIMITS.free.maxShotsPerScene,
          canGenerateStoryboards: TIER_LIMITS.free.canGenerateStoryboards,
        };
        
        await this.db.collection('users').doc(firebaseUid).set(defaultTier);
        return defaultTier;
      }
      
      return userDoc.data() as UserTier;
    } catch (error) {
      console.error('Error getting user tier:', error);
      // Return default free tier on error
      return {
        tier: 'free',
        totalPages: TIER_LIMITS.free.totalPages,
        usedPages: 0,
        maxShotsPerScene: TIER_LIMITS.free.maxShotsPerScene,
        canGenerateStoryboards: TIER_LIMITS.free.canGenerateStoryboards,
      };
    }
  }

  async updateUserTier(firebaseUid: string, updates: Partial<UserTier>): Promise<UserTier> {
    try {
      const userRef = this.db.collection('users').doc(firebaseUid);
      await userRef.update(updates);
      
      const updatedDoc = await userRef.get();
      return updatedDoc.data() as UserTier;
    } catch (error) {
      console.error('Error updating user tier:', error);
      throw new Error('Failed to update user tier');
    }
  }

  async upgradeToPro(firebaseUid: string, stripeCustomerId?: string, stripeSubscriptionId?: string): Promise<UserTier> {
    const proTier: Partial<UserTier> = {
      tier: 'pro',
      totalPages: TIER_LIMITS.pro.totalPages,
      maxShotsPerScene: TIER_LIMITS.pro.maxShotsPerScene,
      canGenerateStoryboards: TIER_LIMITS.pro.canGenerateStoryboards,
      stripeCustomerId,
      stripeSubscriptionId,
    };

    return this.updateUserTier(firebaseUid, proTier);
  }

  async incrementPageUsage(firebaseUid: string, pagesUsed: number): Promise<UserTier> {
    const userTier = await this.getUserTier(firebaseUid);
    const newUsedPages = (userTier.usedPages || 0) + pagesUsed;
    
    return this.updateUserTier(firebaseUid, { usedPages: newUsedPages });
  }

  async checkPageLimit(firebaseUid: string, requestedPages: number): Promise<{ allowed: boolean; reason?: string }> {
    const userTier = await this.getUserTier(firebaseUid);
    
    // Pro users have unlimited pages
    if (userTier.tier === 'pro' || userTier.totalPages === -1) {
      return { allowed: true };
    }

    const currentUsage = userTier.usedPages || 0;
    const totalPages = userTier.totalPages || TIER_LIMITS.free.totalPages;
    
    if (currentUsage + requestedPages > totalPages) {
      return {
        allowed: false,
        reason: `Page limit exceeded. You have used ${currentUsage}/${totalPages} pages. Upgrade to Pro for unlimited pages.`
      };
    }

    return { allowed: true };
  }

  async checkShotsLimit(firebaseUid: string, requestedShots: number): Promise<{ allowed: boolean; reason?: string }> {
    const userTier = await this.getUserTier(firebaseUid);
    
    // Pro users have unlimited shots
    if (userTier.tier === 'pro' || userTier.maxShotsPerScene === -1) {
      return { allowed: true };
    }

    const maxShots = userTier.maxShotsPerScene || TIER_LIMITS.free.maxShotsPerScene;
    
    if (requestedShots > maxShots) {
      return {
        allowed: false,
        reason: `Shot limit exceeded. Free tier allows maximum ${maxShots} shots per scene. Upgrade to Pro for unlimited shots.`
      };
    }

    return { allowed: true };
  }

  async checkStoryboardAccess(firebaseUid: string): Promise<{ allowed: boolean; reason?: string }> {
    const userTier = await this.getUserTier(firebaseUid);
    
    if (!userTier.canGenerateStoryboards) {
      return {
        allowed: false,
        reason: 'Feature requires Pro membership.'
      };
    }

    return { allowed: true };
  }
}

export const tierManager = new FirebaseTierManager();