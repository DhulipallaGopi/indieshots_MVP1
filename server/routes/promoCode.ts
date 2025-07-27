import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { promoCodeService } from '../services/promoCodeService';
import { authMiddleware } from '../auth/jwt';

const router = Router();

// Validation schemas
const validatePromoCodeSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50, 'Promo code too long'),
  email: z.string().email('Valid email required')
});

const applyPromoCodeSchema = z.object({
  code: z.string().min(1, 'Promo code is required').max(50, 'Promo code too long'),
  email: z.string().email('Valid email required'),
  userId: z.string().min(1, 'User ID is required')
});

/**
 * POST /api/promo-codes/validate
 * Validate a promo code without applying it
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const validation = validatePromoCodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { code, email } = validation.data;
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    
    console.log(`Validating promo code: ${code} for email: ${email}`);
    
    const result = await promoCodeService.validatePromoCode(code, email, clientIP);
    
    // Log validation attempt
    console.log(`Promo code validation result for ${code}:`, {
      isValid: result.isValid,
      errorMessage: result.errorMessage,
      usageCount: result.usageCount,
      remainingUses: result.remainingUses
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Error in promo code validation endpoint:', error);
    res.status(500).json({
      error: 'Failed to validate promo code',
      message: 'Please try again or contact support'
    });
  }
});

/**
 * POST /api/promo-codes/apply
 * Apply a promo code to a user account
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const validation = applyPromoCodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { code, email, userId } = validation.data;
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    console.log(`Applying promo code: ${code} for user: ${email} (${userId})`);
    
    // First validate the code
    const validationResult = await promoCodeService.validatePromoCode(code, email, clientIP);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        error: 'Invalid promo code',
        message: validationResult.errorMessage
      });
    }
    
    // Apply the promo code
    const applied = await promoCodeService.applyPromoCode(
      code, 
      email, 
      userId, 
      clientIP,
      userAgent
    );
    
    if (!applied) {
      return res.status(500).json({
        error: 'Failed to apply promo code',
        message: 'Please try again or contact support'
      });
    }
    
    console.log(`✓ Promo code ${code} successfully applied for user ${email}`);
    
    res.json({
      success: true,
      message: 'Promo code applied successfully',
      tier: validationResult.tier,
      grantedFeatures: validationResult.tier === 'pro' ? [
        'Unlimited page processing',
        'Unlimited shots per scene', 
        'AI storyboard generation',
        'Priority support'
      ] : []
    });
    
  } catch (error) {
    console.error('Error in promo code apply endpoint:', error);
    res.status(500).json({
      error: 'Failed to apply promo code',
      message: 'Please try again or contact support'
    });
  }
});

/**
 * GET /api/promo-codes/:code/stats
 * Get statistics for a promo code (admin only)
 */
router.get('/:code/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const user = (req as any).user;
    
    // Simple admin check (you might want to implement proper admin roles)
    const adminEmails = ['admin@indieshots.com', 'premium@demo.com'];
    if (!adminEmails.includes(user?.email)) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }
    
    console.log(`Admin ${user.email} requesting stats for promo code: ${code}`);
    
    const stats = await promoCodeService.getPromoCodeStats(code);
    
    if (!stats) {
      return res.status(404).json({
        error: 'Promo code not found'
      });
    }
    
    res.json({
      code,
      stats,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting promo code stats:', error);
    res.status(500).json({
      error: 'Failed to get promo code statistics'
    });
  }
});

/**
 * GET /api/promo-codes/check-user/:email
 * Check if a user has used any promo codes
 */
router.get('/check-user/:email', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const user = (req as any).user;
    
    // Users can only check their own email or admin can check any
    const adminEmails = ['admin@indieshots.com', 'premium@demo.com'];
    if (user?.email !== email && !adminEmails.includes(user?.email)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }
    
    const hasUsedINDIE2025 = await promoCodeService.hasUserUsedCode('INDIE2025', email);
    
    res.json({
      email,
      hasUsedPromoCodes: {
        INDIE2025: hasUsedINDIE2025
      }
    });
    
  } catch (error) {
    console.error('Error checking user promo code usage:', error);
    res.status(500).json({
      error: 'Failed to check promo code usage'
    });
  }
});

/**
 * GET /api/promo-codes/admin/all
 * Get all promo codes (admin only)
 */
router.get('/admin/all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Admin access check
    const adminEmails = ['admin@indieshots.com', 'premium@demo.com'];
    if (!adminEmails.includes(user?.email)) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }
    
    const promoCodes = await promoCodeService.getAllPromoCodes();
    
    res.json({
      promoCodes,
      count: promoCodes.length
    });
    
  } catch (error) {
    console.error('Error getting all promo codes:', error);
    res.status(500).json({
      error: 'Failed to get promo codes'
    });
  }
});

/**
 * GET /api/promo-codes/status
 * Get current promo code system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isValidToday = promoCodeService.isValidDateForPromoCodes();
    const today = new Date().toISOString().split('T')[0];
    
    res.json({
      isValidDate: isValidToday,
      currentDate: today,
      validDates: ['2025-07-03', '2025-07-06', '2025-07-07', '2025-07-26', '2025-07-27'],
      message: isValidToday 
        ? 'Promo codes are active today!'
        : 'Promo codes are not valid today.'
    });
    
  } catch (error) {
    console.error('Error getting promo code status:', error);
    res.status(500).json({
      error: 'Failed to get promo code status'
    });
  }
});

export default router;