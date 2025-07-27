import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/env/payment-config
 * Get payment configuration for frontend (non-sensitive data only)
 */
router.get('/payment-config', (req: Request, res: Response) => {
  try {
    const config = {
      stripe: {
        enabled: !!process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      },
      payu: {
        enabled: true, // PayU is always available with fallback test credentials
        baseUrl: process.env.NODE_ENV === 'production' 
          ? 'https://secure.payu.in' 
          : 'https://test.payu.in',
      },
      environment: process.env.NODE_ENV || 'development',
      baseUrl: process.env.NODE_ENV === 'production' 
        ? process.env.BASE_URL || 'https://indieshots.onrender.com'
        : 'http://localhost:5000',
    };

    res.json(config);
  } catch (error) {
    console.error('Error getting payment config:', error);
    res.status(500).json({ error: 'Failed to get payment configuration' });
  }
});

export default router;