import { Router } from 'express';
import { fixPromoCodeUsers } from '../utils/fixPromoCodeUsers';

const router = Router();

// Fix promo code users endpoint
router.post('/fix-promo-users', async (req, res) => {
  try {
    console.log('🔧 Starting promo code user fix...');
    const results = await fixPromoCodeUsers();
    
    res.json({
      success: true,
      message: 'Promo code user fix completed',
      results
    });
  } catch (error: any) {
    console.error('Promo code user fix error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix promo code users',
      error: error.message
    });
  }
});

export default router;