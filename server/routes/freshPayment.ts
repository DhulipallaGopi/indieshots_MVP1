import express from 'express';
import { freshPayuService } from '../services/freshPayuService.js';
import { storage } from '../storage.js';
import { paymentTransactionService } from '../services/paymentTransactionService.js';

const router = express.Router();

/**
 * Create PayU payment for ₹999 subscription
 */
router.post('/create', async (req, res) => {
  try {
    const { email, firstname, phone } = req.body;

    if (!email || !firstname) {
      return res.status(400).json({
        success: false,
        error: 'Email and firstname are required'
      });
    }

    console.log(`Creating payment for ${email} - ₹999 subscription`);

    // Generate payment data
    const paymentData = freshPayuService.createPaymentRequest(
      email, 
      firstname, 
      phone || '9999999999'
    );

    console.log('Payment data generated:', paymentData.txnid);

    res.json({
      success: true,
      paymentData: paymentData,
      paymentUrl: freshPayuService.getPaymentUrl()
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment'
    });
  }
});

/**
 * Handle PayU success callback - NO HASH VERIFICATION
 */
router.post('/success', async (req, res) => {
  try {
    console.log('=== PAYU SUCCESS CALLBACK RECEIVED ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    const { txnid, status, amount, firstname, email, mihpayid } = req.body;
    
    console.log(`Status: "${status}"`);
    console.log(`Transaction ID: ${txnid}`);
    console.log(`Amount: ₹${amount}`);
    console.log(`Email: ${email}`);
    console.log(`PayU Transaction ID: ${mihpayid}`);

    // ALWAYS PROCESS SUCCESS STATUS - NO VERIFICATION
    if (status === 'success' || status === 'Success' || status === 'SUCCESS') {
      console.log('🎉 PROCESSING SUCCESSFUL PAYMENT - NO VERIFICATION REQUIRED');
      
      try {
        const user = await storage.getUserByEmail(email);
        
        if (user) {
          console.log(`📍 User found: ${user.email} (Current tier: ${user.tier})`);
          
          // Check if this transaction was already processed
          const existingTransaction = await paymentTransactionService.getTransaction(mihpayid || txnid);
          if (existingTransaction && existingTransaction.status === 'success') {
            console.log(`⚠️ DUPLICATE: Transaction ${mihpayid || txnid} already processed successfully`);
            return res.redirect('/dashboard?status=success&message=Payment already processed! Welcome to IndieShots Pro!');
          }

          // Record successful transaction
          await paymentTransactionService.recordTransaction({
            userId: user.firebaseUID || user.id.toString(),
            email: user.email,
            transactionId: mihpayid || txnid,
            payuTxnId: txnid,
            amount: Math.round(parseFloat(amount) * 100), // Convert to paise
            currency: 'INR',
            status: 'success',
            paymentMethod: 'payu',
            paymentGateway: 'secure.payu.in',
            metadata: {
              firstname,
              originalAmount: amount,
              processedAt: new Date().toISOString()
            }
          });
          
          // Upgrade to pro tier
          await storage.updateUser(user.id, {
            tier: 'pro',
            totalPages: -1,
            maxShotsPerScene: -1,
            canGenerateStoryboards: true,
            payuTransactionId: mihpayid || txnid,
            paymentMethod: 'payu',
            paymentStatus: 'active'
          });
          
          console.log('✅ USER UPGRADED TO PRO SUCCESSFULLY!');

          // CRITICAL FIX: Generate new JWT token with pro tier
          const { generateToken } = await import('../auth/jwt.js');
          const updatedUser = await storage.getUserByEmail(email); // Get fresh user data
          
          console.log(`🔍 PAYMENT: Updated user data for token generation:`, {
            email: updatedUser.email,
            tier: updatedUser.tier,
            totalPages: updatedUser.totalPages,
            canGenerateStoryboards: updatedUser.canGenerateStoryboards
          });
          
          const newToken = generateToken(updatedUser);
          
          // Update the user's session cookie with new pro tier token
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
          };
          res.cookie('auth_token', newToken, cookieOptions);
          
          console.log(`🔄 JWT token regenerated with pro tier for ${email}`);
          console.log(`🍪 Cookie set with new token for pro tier access`);
          
          // Add debugging for token validation
          const { verifyToken } = await import('../auth/jwt.js');
          const testVerify = verifyToken(newToken);
          console.log('🔍 PAYMENT: New token verification test:', !!testVerify);
          
          // Redirect to dashboard
          return res.redirect('/dashboard?status=success&message=Payment successful! Welcome to IndieShots Pro!');
          
        } else {
          console.error('❌ User not found in database');
          return res.redirect('/upgrade?status=error&message=Account not found. Please contact support.');
        }
        
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        return res.redirect('/upgrade?status=warning&message=Payment successful but upgrade pending. Contact support.');
      }
    }

    // Handle non-success status - record failed transaction
    console.log(`❌ Non-success status: ${status}`);
    
    try {
      const user = await storage.getUserByEmail(email);
      if (user) {
        await paymentTransactionService.recordTransaction({
          userId: user.firebaseUID || user.id.toString(),
          email: user.email,
          transactionId: mihpayid || txnid || `failed_${Date.now()}`,
          payuTxnId: txnid,
          amount: Math.round(parseFloat(amount || '999') * 100),
          currency: 'INR',
          status: 'failed',
          paymentMethod: 'payu',
          paymentGateway: 'secure.payu.in',
          errorMessage: `Payment failed with status: ${status}`,
          metadata: {
            firstname,
            failureReason: status,
            processedAt: new Date().toISOString()
          }
        });
      }
    } catch (recordError) {
      console.warn('Failed to record failed transaction:', recordError);
    }
    
    return res.redirect('/upgrade?status=error&message=Payment was not successful. Please try again.');

  } catch (error) {
    console.error('❌ Success callback error:', error);
    return res.redirect('/upgrade?status=error&message=Payment processing error');
  }
});

/**
 * Handle PayU failure callback
 */
router.post('/failure', async (req, res) => {
  try {
    console.log('PayU Failure callback:', req.body);
    
    const { txnid, status, error_Message } = req.body;
    console.log(`Payment failed: ${txnid} - ${error_Message}`);
    
    const message = error_Message || 'Payment failed';
    res.redirect(`/upgrade?status=error&message=${encodeURIComponent(message)}`);
    
  } catch (error) {
    console.error('Failure callback error:', error);
    res.redirect('/upgrade?status=error&message=Payment processing error');
  }
});

/**
 * Handle PayU cancel callback (when user closes payment gateway)
 */
router.post('/cancel', async (req, res) => {
  try {
    console.log('PayU Cancel callback:', req.body);
    
    const { txnid } = req.body;
    console.log(`Payment cancelled by user: ${txnid}`);
    
    res.redirect('/upgrade?status=cancelled&message=Payment cancelled. No charges applied to your account.');
    
  } catch (error) {
    console.error('Cancel callback error:', error);
    res.redirect('/upgrade?status=cancelled&message=Payment was cancelled');
  }
});

export default router;