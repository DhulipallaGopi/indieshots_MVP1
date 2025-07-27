/**
 * Universal INDIE2025 Promo Code Validator
 * Ensures consistent pro tier assignment for all INDIE2025 users
 */

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface PromoValidationResult {
  isValid: boolean;
  shouldBePro: boolean;
  currentTier: string;
  needsUpdate: boolean;
  message: string;
}

export class PromoCodeUniversalValidator {
  
  /**
   * Validate if user should have pro tier based on INDIE2025 usage
   */
  static async validateUserPromoTier(email: string): Promise<PromoValidationResult> {
    try {
      console.log(`🔍 VALIDATING PROMO TIER: ${email}`);
      
      // Check if user exists
      const user = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (user.length === 0) {
        return {
          isValid: false,
          shouldBePro: false,
          currentTier: 'none',
          needsUpdate: false,
          message: 'User not found'
        };
      }

      const userData = user[0];
      
      // Check if user used INDIE2025 promo code
      const promoUsage = await db.execute(`
        SELECT pcu.granted_tier, pc.code 
        FROM promo_code_usage pcu 
        JOIN promo_codes pc ON pcu.promo_code_id = pc.id 
        WHERE pcu.user_email = $1 AND pc.code = 'INDIE2025'
      `, [email.toLowerCase()]);

      const hasINDIE2025 = promoUsage.rows.length > 0;
      const shouldBePro = hasINDIE2025;
      const currentTier = userData.tier;
      const needsUpdate = shouldBePro && currentTier !== 'pro';

      console.log(`📊 PROMO VALIDATION RESULT for ${email}:`);
      console.log(`   - Has INDIE2025: ${hasINDIE2025}`);
      console.log(`   - Should be Pro: ${shouldBePro}`);
      console.log(`   - Current Tier: ${currentTier}`);
      console.log(`   - Needs Update: ${needsUpdate}`);

      return {
        isValid: true,
        shouldBePro,
        currentTier,
        needsUpdate,
        message: needsUpdate 
          ? `User ${email} has INDIE2025 but is ${currentTier} tier - needs pro upgrade`
          : `User ${email} tier is correct: ${currentTier}`
      };
      
    } catch (error) {
      console.error('Promo validation error:', error);
      return {
        isValid: false,
        shouldBePro: false,
        currentTier: 'error',
        needsUpdate: false,
        message: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Check user tier status (read-only, no automatic fixes)
   */
  static async checkUserPromoTier(email: string): Promise<boolean> {
    try {
      const validation = await this.validateUserPromoTier(email);
      
      if (!validation.needsUpdate) {
        console.log(`✓ ${email} tier is already correct`);      
        return true;
      }

      // Log issue but don't automatically fix
      console.log(`ℹ️ TIER MISMATCH: ${email} has promo code but is ${validation.currentTier} tier`);
      console.log(`User should contact support or complete payment process if pro tier is expected`);
      return false;
      
    } catch (error) {
      console.error(`Failed to check promo tier for ${email}:`, error);
      return false;
    }
  }

  /**
   * Check if INDIE2025 user has correct tier (read-only)
   */
  static async checkINDIE2025Status(email: string, couponCode: string): Promise<boolean> {
    if (couponCode.toUpperCase() !== 'INDIE2025') {
      return false;
    }

    console.log(`🔍 CHECKING INDIE2025 STATUS: ${email}`);
    
    try {
      // Check current state
      const validation = await this.validateUserPromoTier(email);
      
      // Log status but don't automatically fix
      if (validation.needsUpdate || !validation.shouldBePro) {
        console.log(`ℹ️ INDIE2025 MISMATCH: ${email} has promo code but tier is ${validation.currentTier}`);
        console.log(`User should complete signup process or contact support for tier correction`);
        return false;
      }
      
      console.log(`✓ INDIE2025 STATUS: ${email} already has correct pro tier`);
      return true;
      
    } catch (error) {
      console.error(`INDIE2025 status check error for ${email}:`, error);
      return false;
    }
  }
}