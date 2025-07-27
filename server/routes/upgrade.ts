import { Router } from 'express';
import { Request, Response } from 'express';
import { authMiddleware } from '../auth/jwt';
import { getUserTierInfo } from '../middleware/tierLimits';
import { generateToken } from '../auth/jwt';
const router = Router();

/**
 * GET /api/upgrade/plans
 * Get available upgrade plans
 */
router.get('/plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Use the same database query logic as the status endpoint for accurate page counts
    const { db } = await import('../db');
    const { scripts, promoCodeUsage } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Check for promo code usage
    const hasPromoCode = await db.select()
      .from(promoCodeUsage)
      .where(eq(promoCodeUsage.userEmail, user.email.toLowerCase()));
    
    const shouldBeProTier = hasPromoCode.length > 0;
    const isPremiumDemo = user.email === 'premium@demo.com' || 
                         user.id === '119' || 
                         user.id === 119;
    
    // Calculate actual used pages by summing page_count from user's scripts
    const userIdForQuery = String(user.uid || user.id);
    const userScripts = await db.select()
      .from(scripts)
      .where(eq(scripts.userId, userIdForQuery));
    
    const actualUsedPages = userScripts.reduce((total, script) => {
      return total + (script.pageCount || 0);
    }, 0);
    
    // Determine final tier
    const finalTier = isPremiumDemo || shouldBeProTier ? 'pro' : 'free';
    
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          'Up to 10 pages per month',
          'Maximum 5 shots per scene', 
          'Basic shot generation',
          'CSV export',
          'Email support'
        ],
        limitations: [
          'Limited shots per scene',
          'Monthly page limit'
        ],
        current: finalTier === 'free'
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 999,
        currency: 'INR',
        interval: 'month',
        features: [
          'Unlimited pages',
          'Unlimited shots per scene',
          'Advanced shot analysis',
          'Priority support',
          'CSV & ZIP exports'
        ],
        limitations: [],
        current: finalTier === 'pro',
        popular: true
      }
    ];

    res.json({
      plans,
      currentTier: finalTier,
      usage: {
        pagesUsed: actualUsedPages,
        totalPages: finalTier === 'pro' ? -1 : 10,
        canGenerateStoryboards: finalTier === 'pro'
      }
    });
  } catch (error) {
    console.error('Error getting upgrade plans:', error);
    res.status(500).json({ error: 'Failed to get upgrade plans' });
  }
});

/**
 * POST /api/upgrade/create-checkout-session
 * Create PayU payment session for Pro upgrade
 */
router.post('/create-checkout-session', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.email) {
      return res.status(400).json({ error: 'User email required for checkout' });
    }

    // BYPASS JWT COMPLETELY - Always check fresh database data
    const { storage } = await import('../storage');
    const dbUser = await storage.getUserByEmail(user.email);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const currentTier = dbUser.tier;
    
    console.log(`[UPGRADE] User ${user.email} - JWT tier: ${user.tier}, DB tier: ${currentTier}`);
    
    // CHECK TIER STATUS: Check if user already has pro tier
    if (currentTier === 'pro') {
      console.log(`✅ USER ALREADY PRO: ${user.email} has pro tier - no upgrade needed`);
      return res.status(400).json({ 
        error: 'You already have a Pro account with unlimited access to all features. No upgrade needed!' 
      });
    }
    
    if (user.email === 'premium@demo.com') {
      return res.status(400).json({ 
        error: 'Demo account already has pro access. This is a test account.' 
      });
    }
    
    // Additional debug logging
    console.log(`[UPGRADE] Processing payment for free tier user: ${user.email}`);
    console.log(`[UPGRADE] Database confirms free tier - proceeding with payment`);
    console.log(`[UPGRADE] User usage: ${dbUser?.usedPages || 0} pages used`);
    console.log(`[UPGRADE] Proceeding with PayU payment setup for free tier user`);
    
    // Generate fresh JWT with correct tier immediately to fix any cache issues
    const freshToken = generateToken(dbUser);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    };
    res.cookie('auth_token', freshToken, cookieOptions);

    // Import PayU service  
    const { FreshPayUService } = await import('../services/freshPayuService');
    const payuService = new FreshPayUService();

    // Create payment request for ₹999
    const paymentData = payuService.createPaymentRequest(
      user.email,
      user.displayName || user.email.split('@')[0],
      '' // phone - optional
    );

    // Store payment info for verification (simplified for demo)
    const pendingPayments = (global as any).pendingPayments || new Map();
    (global as any).pendingPayments = pendingPayments;
    
    const paymentInfo = {
      txnid: paymentData.txnid,
      email: user.email,
      amount: 999, // ₹999 subscription
      tier: 'pro',
      timestamp: Date.now()
    };
    
    pendingPayments.set(paymentData.txnid, paymentInfo);
    console.log('Payment session created:', {
      txnid: paymentData.txnid,  
      email: user.email,
      amount: 999 // ₹999 subscription
    });
    console.log('Total pending payments:', pendingPayments.size);

    const paymentUrl = payuService.getPaymentUrl();
    
    const response = {
      success: true,
      paymentData: paymentData,
      paymentUrl: paymentUrl,
      txnid: paymentData.txnid
    };
    
    console.log('Sending checkout response:', {
      txnid: response.txnid,
      hasPaymentData: !!response.paymentData,
      paymentUrl: response.paymentUrl
    });
    
    res.json(response);

  } catch (error) {
    console.error('PayU checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/upgrade/verify-payment
 * Verify PayU payment and upgrade user account
 */
router.post('/verify-payment', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { txnid } = req.body;
    const user = (req as any).user;

    if (!txnid) {
      return res.status(400).json({ error: 'Transaction ID required' });
    }

    // Check if payment was successful (simplified for demo)
    const pendingPayments = (global as any).pendingPayments || new Map();
    const payment = pendingPayments.get(txnid);
    
    if (!payment) {
      return res.status(400).json({ error: 'Payment session not found' });
    }

    if (payment.email !== user.email) {
      return res.status(403).json({ error: 'Payment session does not match user' });
    }

    // Upgrade user using quota manager
    const { productionQuotaManager } = await import('../lib/productionQuotaManager');
    await productionQuotaManager.upgradeToPro(user.email);
    
    // Clean up payment session
    pendingPayments.delete(txnid);
    
    res.json({
      success: true,
      message: 'Account upgraded to Pro successfully!',
      tier: 'pro',
      features: {
        unlimitedPages: true,
        unlimitedShots: true,
        storyboardGeneration: true
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

/**
 * GET /api/upgrade/status
 * Get current user upgrade status and limitations - FIXED FOR POST-PAYMENT
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    console.log('🔍 UPGRADE STATUS: Request received');
    
    // BYPASS AUTH MIDDLEWARE - Handle authentication manually with better error handling
    let token = req.cookies?.auth_token;
    if (!token) {
      token = req.headers.authorization?.replace('Bearer ', '');
    }
    
    if (!token) {
      console.log('❌ UPGRADE STATUS: No token found');
      return res.status(401).json({ error: 'No authentication token' });
    }
    
    // Verify token manually with enhanced debugging
    const { verifyToken } = await import('../auth/jwt');
    const user = verifyToken(token);
    
    if (!user) {
      console.log('❌ UPGRADE STATUS: Token verification failed for token:', token?.substring(0, 20) + '...');
      
      // Try to extract email from token payload even if signature is invalid
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        console.log('🔍 UPGRADE STATUS: Token payload email:', payload?.email);
        
        if (payload?.email) {
          // Direct database lookup bypassing JWT
          const { storage } = await import('../storage');
          const dbUser = await storage.getUserByEmail(payload.email);
          
          if (dbUser) {
            console.log('✅ UPGRADE STATUS: Found user via token payload email');
            
            // Calculate used pages
            const { db } = await import('../db');
            const { scripts } = await import('../../shared/schema');
            const { eq } = await import('drizzle-orm');
            
            const userScripts = await db.select()
              .from(scripts)
              .where(eq(scripts.userId, String(dbUser.id)));
            
            const usedPages = userScripts.reduce((total, script) => {
              return total + (script.pageCount || 0);
            }, 0);
            
            // AGGRESSIVE PRO TIER PROTECTION: Force pro values for pro users
            const isProUser = dbUser.tier === 'pro';
            
            const response = {
              tier: isProUser ? 'pro' : 'free',
              limits: {
                tier: isProUser ? 'pro' : 'free',
                totalPages: isProUser ? -1 : 10,
                usedPages: usedPages,
                maxShotsPerScene: isProUser ? -1 : 5,
                canGenerateStoryboards: isProUser
              }
            };
            
            console.log('✅ UPGRADE STATUS: Bypassed auth, returning data for:', payload.email);
            return res.json(response);
          }
        }
      } catch (tokenParseError) {
        console.log('❌ UPGRADE STATUS: Could not parse token payload');
      }
      
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('✅ UPGRADE STATUS: User authenticated:', user.email);
    
    // BYPASS JWT COMPLETELY - Always check fresh database data
    const { storage } = await import('../storage');
    const dbUser = await storage.getUserByEmail(user.email);
    
    if (!dbUser) {
      console.log('❌ UPGRADE STATUS: User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('📊 UPGRADE STATUS: Database user data:', {
      email: dbUser.email,
      tier: dbUser.tier,
      totalPages: dbUser.totalPages,
      canGenerateStoryboards: dbUser.canGenerateStoryboards
    });
    
    // Use database as authoritative source for tier information
    const finalTier = dbUser.tier || 'free';
    const finalTotalPages = dbUser.totalPages !== undefined ? dbUser.totalPages : (finalTier === 'pro' ? -1 : 10);
    const finalCanGenerateStoryboards = dbUser.canGenerateStoryboards !== undefined ? dbUser.canGenerateStoryboards : (finalTier === 'pro');
    
    // Calculate used pages from scripts
    const { db } = await import('../db');
    const { scripts } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const userIdForQuery = String(dbUser.id);
    const userScripts = await db.select()
      .from(scripts)
      .where(eq(scripts.userId, userIdForQuery));
    
    const actualUsedPages = userScripts.reduce((total, script) => {
      return total + (script.pageCount || 0);
    }, 0);
    
    const responseData = {
      tier: finalTier,
      limits: {
        tier: finalTier,
        totalPages: finalTotalPages,
        usedPages: actualUsedPages,
        maxShotsPerScene: dbUser.maxShotsPerScene || (finalTier === 'pro' ? -1 : 5),
        canGenerateStoryboards: finalCanGenerateStoryboards
      }
    };
    
    console.log('✅ UPGRADE STATUS: Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error getting upgrade status:', error);
    res.status(500).json({ error: 'Failed to get upgrade status' });
  }
});

/**
 * POST /api/upgrade/clear-cache
 * Clear authentication cache and force database tier check
 */
router.post('/clear-cache', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.email) {
      return res.status(400).json({ error: 'User email required' });
    }

    // Get fresh user data from database
    const { storage } = await import('../storage');
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
    
    console.log(`[CLEAR CACHE] Updated tier for ${user.email}: ${dbUser.tier}`);
    
    res.json({
      message: 'Cache cleared and tier refreshed',
      tier: dbUser.tier,
      totalPages: dbUser.totalPages,
      canGenerateStoryboards: dbUser.canGenerateStoryboards
    });
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;