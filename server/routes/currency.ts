import { Router, Request, Response } from 'express';
import { currencyConverter } from '../services/currencyConverter';

const router = Router();

/**
 * GET /api/currency/subscription-pricing
 * Get subscription pricing in both INR and USD
 */
router.get('/subscription-pricing', async (req: Request, res: Response) => {
  try {
    console.log('Fetching subscription pricing with currency conversion...');
    
    const pricing = await currencyConverter.getSubscriptionPricing();
    
    console.log('Pricing fetched:', {
      inr: pricing.inr.display,
      usd: pricing.usd.display,
      rate: pricing.exchangeRate
    });

    res.json({
      success: true,
      pricing,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Return fallback pricing if conversion fails
    res.json({
      success: false,
      pricing: {
        inr: { amount: 999, display: '₹999', currency: 'INR' },
        usd: { amount: 12, display: '$12', currency: 'USD' },
        exchangeRate: 0.012,
        note: 'Using fallback exchange rate due to API error'
      },
      error: 'Currency conversion temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/currency/convert/:amount
 * Convert specific INR amount to USD
 */
router.get('/convert/:amount', async (req: Request, res: Response) => {
  try {
    const inrAmount = parseFloat(req.params.amount);
    
    if (isNaN(inrAmount) || inrAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Please provide a positive number.'
      });
    }

    const conversion = await currencyConverter.convertINRtoUSD(inrAmount);
    
    res.json({
      success: true,
      conversion: {
        ...conversion,
        display: currencyConverter.formatCurrencyDisplay(conversion.inrAmount, conversion.usdAmount)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'Currency conversion failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;