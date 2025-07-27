import express from 'express';
import { paymentTransactionService } from '../services/paymentTransactionService.js';
import { storage } from '../storage.js';

const router = express.Router();

/**
 * GET /api/payment-history/history
 * Get user's payment history (successful payments only)
 */
router.get('/history', async (req, res) => {
  try {
    // @ts-ignore - User is attached by auth middleware
    const userId = req.user?.id || req.user?.firebaseUID;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`📊 PAYMENT HISTORY: Fetching for user ${userEmail} (${userId})`);

    // Get payment history from storage (which now uses the transaction service)
    const history = await storage.getUserPaymentHistory(userId);

    console.log(`📊 PAYMENT HISTORY: Found ${history.length} transactions for ${userEmail}`);

    res.json({
      success: true,
      payments: history
    });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch payment history' 
    });
  }
});

/**
 * GET /api/payment-history/stats
 * Get user's payment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // @ts-ignore - User is attached by auth middleware
    const userId = req.user?.id || req.user?.firebaseUID;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`📊 PAYMENT STATS: Fetching for user ${userEmail} (${userId})`);

    const stats = await paymentTransactionService.getUserPaymentStats(userId);

    // Convert amounts from paise to rupees
    const displayStats = {
      ...stats,
      totalAmountPaid: stats.totalAmountPaid / 100,
      lastSuccessfulPayment: stats.lastSuccessfulPayment ? {
        ...stats.lastSuccessfulPayment,
        amount: stats.lastSuccessfulPayment.amount / 100
      } : undefined
    };

    console.log(`📊 PAYMENT STATS: ${stats.successfulPayments} successful payments, ₹${displayStats.totalAmountPaid} total`);

    res.json({
      success: true,
      stats: displayStats
    });

  } catch (error) {
    console.error('Payment stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch payment statistics' 
    });
  }
});

/**
 * GET /api/payment-history/transactions/all (Admin only - shows all attempts)
 */
router.get('/transactions/all', async (req, res) => {
  try {
    // @ts-ignore - User is attached by auth middleware
    const userId = req.user?.id || req.user?.firebaseUID;
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only allow for admin users or specific test accounts
    const adminEmails = ['premium@demo.com', 'dhulipallagopichandu@gmail.com', 'gopichandudhulipalla@gmail.com'];
    if (!adminEmails.includes(userEmail)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`🔍 ADMIN: Fetching all transactions for user ${userEmail} (${userId})`);

    const allTransactions = await paymentTransactionService.getAllUserTransactions(userId);

    // Convert amounts from paise to rupees for display
    const displayTransactions = allTransactions.map(transaction => ({
      ...transaction,
      amount: transaction.amount / 100
    }));

    console.log(`🔍 ADMIN: Found ${allTransactions.length} total transactions for ${userEmail}`);

    res.json({
      success: true,
      transactions: displayTransactions
    });

  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transaction details' 
    });
  }
});

export default router;