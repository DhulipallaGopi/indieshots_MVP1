import { db } from '../db';
import { promoCodes, promoCodeUsage, users } from '../../shared/schema';
import { eq, and, gte, desc, count } from 'drizzle-orm';
import type { PromoCode, PromoCodeUsage, InsertPromoCodeUsage } from '../../shared/schema';

export interface PromoCodeValidation {
  isValid: boolean;
  tier?: string;
  errorMessage?: string;
  usageCount?: number;
  remainingUses?: number;
  promoCodeId?: number;
}

export interface PromoCodeStats {
  totalUses: number;
  uniqueUsers: number;
  usageByDate: { date: string; count: number }[];
  recentUsage: Array<{
    email: string;
    usedAt: Date;
    ipAddress: string;
    userAgent?: string;
  }>;
  remainingUses: number;
  usageLimit: number;
}

export interface RateLimitInfo {
  maxAttemptsPerIP: number;
  maxAttemptsPerEmail: number;
  cooldownPeriod: number; // milliseconds
}

// Rate limiting configuration
const RATE_LIMITS: RateLimitInfo = {
  maxAttemptsPerIP: 10, // per hour
  maxAttemptsPerEmail: 5, // per hour
  cooldownPeriod: 3600000 // 1 hour in milliseconds
};

// In-memory rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();

export class PromoCodeService {
  
  /**
   * Check rate limiting for IP and email
   */
  private checkRateLimit(key: string, maxAttempts: number): boolean {
    const now = Date.now();
    const record = rateLimitStore.get(key);
    
    if (!record) {
      rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if cooldown period has passed
    if (now - record.lastAttempt > RATE_LIMITS.cooldownPeriod) {
      rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
      return true;
    }
    
    // Check if under limit
    if (record.attempts < maxAttempts) {
      record.attempts++;
      record.lastAttempt = now;
      return true;
    }
    
    return false;
  }
  
  /**
   * Validate if a promo code can be used today by a specific user
   */
  async validatePromoCode(
    code: string, 
    userEmail: string, 
    ipAddress?: string
  ): Promise<PromoCodeValidation> {
    try {
      // Rate limiting checks
      if (ipAddress && !this.checkRateLimit(`ip:${ipAddress}`, RATE_LIMITS.maxAttemptsPerIP)) {
        return {
          isValid: false,
          errorMessage: 'Too many attempts from this IP. Please try again later.'
        };
      }
      
      if (!this.checkRateLimit(`email:${userEmail}`, RATE_LIMITS.maxAttemptsPerEmail)) {
        return {
          isValid: false,
          errorMessage: 'Too many attempts for this email. Please try again later.'
        };
      }
      
      // Get promo code from database
      const promoCode = await db.select()
        .from(promoCodes)
        .where(and(
          eq(promoCodes.code, code.toUpperCase()),
          eq(promoCodes.isActive, true)
        ))
        .limit(1);
      
      if (promoCode.length === 0) {
        return {
          isValid: false,
          errorMessage: 'Invalid promo code'
        };
      }
      
      const promo = promoCode[0];
      
      // Check if today is a valid date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!promo.validDates.includes(today)) {
        return {
          isValid: false,
          errorMessage: `Promo code is only valid on specific dates: ${promo.validDates.join(', ')}`
        };
      }
      
      // Check usage limit
      const usageLimit = promo.usageLimit ?? -1;
      const currentUsage = promo.currentUsage ?? 0;
      
      if (usageLimit !== -1 && currentUsage >= usageLimit) {
        return {
          isValid: false,
          errorMessage: 'Promo code usage limit reached'
        };
      }
      
      // Check if user already used this code
      const existingUsage = await db.select()
        .from(promoCodeUsage)
        .where(and(
          eq(promoCodeUsage.promoCodeId, promo.id),
          eq(promoCodeUsage.userEmail, userEmail.toLowerCase())
        ))
        .limit(1);
      
      if (existingUsage.length > 0) {
        return {
          isValid: false,
          errorMessage: 'You have already used this promo code'
        };
      }
      
      // Calculate remaining uses
      const remainingUses = usageLimit === -1 ? -1 : usageLimit - currentUsage;
      
      return {
        isValid: true,
        tier: promo.tierGranted || 'pro',
        usageCount: currentUsage,
        remainingUses,
        promoCodeId: promo.id
      };
      
    } catch (error) {
      console.error('Error validating promo code:', error);
      return {
        isValid: false,
        errorMessage: 'Error validating promo code'
      };
    }
  }
  
  /**
   * Apply a promo code to a user account
   */
  async applyPromoCode(
    code: string, 
    userEmail: string, 
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Validate the promo code first
      console.log(`🎯 PROMO CODE APPLICATION: ${code.toUpperCase()} for user ${userEmail}`);
      
      const validation = await this.validatePromoCode(code, userEmail, ipAddress);
      
      if (!validation.isValid || !validation.promoCodeId) {
        console.error(`❌ Cannot apply invalid promo code ${code.toUpperCase()}:`, validation.errorMessage);
        return false;
      }
      
      console.log(`✅ PROMO CODE VALIDATED: ${code.toUpperCase()} grants ${validation.tier} tier to ${userEmail}`);
      
      // Create usage record
      const usageData: InsertPromoCodeUsage = {
        promoCodeId: validation.promoCodeId,
        userEmail: userEmail.toLowerCase(),
        userId,
        grantedTier: validation.tier,
        ipAddress,
        userAgent
      };
      
      await db.insert(promoCodeUsage).values(usageData);
      
      // FIREBASE-FIRST APPROACH: Only update users who exist in Firebase
      // This ensures data consistency - no PostgreSQL users without Firebase users
      
      // First, verify if user exists in Firebase
      let userExistsInFirebase = false;
      try {
        const admin = await import('firebase-admin');
        const firebaseAdmin = admin.default;
        
        if (firebaseAdmin.apps.length) {
          await firebaseAdmin.auth().getUserByEmail(userEmail.toLowerCase());
          userExistsInFirebase = true;
          console.log(`✓ Verified user ${userEmail} exists in Firebase`);
        }
      } catch (error) {
        console.log(`User ${userEmail} not found in Firebase - will be handled during signup`);
      }
      
      if (userExistsInFirebase) {
        // User exists in Firebase, check if they also exist in PostgreSQL
        const existingUser = await db.select()
          .from(users)
          .where(eq(users.email, userEmail.toLowerCase()))
          .limit(1);
        
        if (existingUser.length > 0) {
          // Update existing PostgreSQL user's tier
          await db.update(users)
            .set({ 
              tier: validation.tier,
              totalPages: validation.tier === 'pro' ? -1 : 10,
              maxShotsPerScene: validation.tier === 'pro' ? -1 : 5,
              canGenerateStoryboards: validation.tier === 'pro',
              updatedAt: new Date()
            })
            .where(eq(users.email, userEmail.toLowerCase()));

          // Also update user_quotas table for comprehensive tier synchronization
          if (validation.tier === 'free' || validation.tier === 'pro') {
            try {
              const { productionQuotaManager } = await import('../lib/productionQuotaManager');
              await productionQuotaManager.updateUserTier(userId, validation.tier);
              console.log(`✓ Updated user_quotas table for ${userEmail} to tier: ${validation.tier}`);
            } catch (error) {
              console.log(`⚠️ Could not update user_quotas table:`, error);
            }
          }

          console.log(`✓ Updated existing Firebase+PostgreSQL user ${userEmail} to tier: ${validation.tier}`);
        } else {
          console.log(`✓ Firebase user exists but not in PostgreSQL - will sync on next signin`);
        }
      } else {
        console.log(`✓ New user - tier will be set via Firebase custom claims during signup`);
      }
      
      // Update promo code usage count
      await db.update(promoCodes)
        .set({ 
          currentUsage: (validation.usageCount ?? 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(promoCodes.id, validation.promoCodeId));
      
      console.log(`✓ Promo code ${code} applied for user ${userEmail}, tier upgraded to ${validation.tier}`);
      return true;
      
    } catch (error) {
      console.error('Error applying promo code:', error);
      return false;
    }
  }
  
  /**
   * Check if user has already used a specific promo code
   */
  async hasUserUsedCode(code: string, userEmail: string): Promise<boolean> {
    try {
      const promoCode = await db.select({ id: promoCodes.id })
        .from(promoCodes)
        .where(eq(promoCodes.code, code.toUpperCase()))
        .limit(1);
      
      if (promoCode.length === 0) {
        return false;
      }
      
      const usage = await db.select()
        .from(promoCodeUsage)
        .where(and(
          eq(promoCodeUsage.promoCodeId, promoCode[0].id),
          eq(promoCodeUsage.userEmail, userEmail.toLowerCase())
        ))
        .limit(1);
      
      return usage.length > 0;
      
    } catch (error) {
      console.error('Error checking promo code usage:', error);
      return false;
    }
  }
  
  /**
   * Get comprehensive statistics for a promo code
   */
  async getPromoCodeStats(code: string): Promise<PromoCodeStats | null> {
    try {
      // Get promo code info
      const promoCode = await db.select()
        .from(promoCodes)
        .where(eq(promoCodes.code, code.toUpperCase()))
        .limit(1);
      
      if (promoCode.length === 0) {
        return null;
      }
      
      const promo = promoCode[0];
      
      // Get total usage count
      const totalUsage = await db.select({ count: count() })
        .from(promoCodeUsage)
        .where(eq(promoCodeUsage.promoCodeId, promo.id));
      
      // Get unique users count
      const uniqueUsers = await db.selectDistinct({ userEmail: promoCodeUsage.userEmail })
        .from(promoCodeUsage)
        .where(eq(promoCodeUsage.promoCodeId, promo.id));
      
      // Get recent usage (last 50)
      const recentUsage = await db.select({
        email: promoCodeUsage.userEmail,
        usedAt: promoCodeUsage.usedAt,
        ipAddress: promoCodeUsage.ipAddress,
        userAgent: promoCodeUsage.userAgent
      })
        .from(promoCodeUsage)
        .where(eq(promoCodeUsage.promoCodeId, promo.id))
        .orderBy(desc(promoCodeUsage.usedAt))
        .limit(50);
      
      // Calculate remaining uses
      const usageLimit = promo.usageLimit ?? -1;
      const currentUsage = promo.currentUsage ?? 0;
      const remainingUses = usageLimit === -1 ? -1 : usageLimit - currentUsage;
      
      return {
        totalUses: totalUsage[0]?.count || 0,
        uniqueUsers: uniqueUsers.length,
        usageByDate: [], // Could be implemented with more complex query
        recentUsage: recentUsage.map(usage => ({
          email: usage.email,
          usedAt: usage.usedAt,
          ipAddress: usage.ipAddress || 'Unknown',
          userAgent: usage.userAgent || undefined
        })),
        remainingUses,
        usageLimit: usageLimit
      };
      
    } catch (error) {
      console.error('Error getting promo code stats:', error);
      return null;
    }
  }
  
  /**
   * Get all active promo codes (admin only)
   */
  async getAllPromoCodes(): Promise<PromoCode[]> {
    try {
      return await db.select()
        .from(promoCodes)
        .where(eq(promoCodes.isActive, true))
        .orderBy(desc(promoCodes.createdAt));
        
    } catch (error) {
      console.error('Error getting all promo codes:', error);
      return [];
    }
  }
  
  /**
   * Check if current date is valid for any promo codes
   */
  isValidDateForPromoCodes(): boolean {
    const today = new Date().toISOString().split('T')[0];
    const validDates = ['2025-07-03', '2025-07-06', '2025-07-07', '2025-07-26', '2025-07-27'];
    return validDates.includes(today);
  }

  /**
   * Delete all promo code usage records for a user (for permanent account deletion)
   */
  static async deleteUserPromoCodeUsage(email: string): Promise<void> {
    try {
      await db.delete(promoCodeUsage)
        .where(eq(promoCodeUsage.userEmail, email.toLowerCase()));
      
      console.log(`Deleted promo code usage records for user: ${email}`);
    } catch (error) {
      console.error('Error deleting promo code usage records:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const promoCodeService = new PromoCodeService();