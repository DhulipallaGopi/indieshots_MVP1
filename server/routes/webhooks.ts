import { Router, Request, Response } from 'express';
import { StripeService } from '../services/stripeService';
import { EmailService } from '../services/emailService';
import { storage } from '../storage';
import crypto from 'crypto';

const router = Router();
const stripeService = new StripeService();
const emailService = new EmailService();

/**
 * POST /api/webhooks/payu
 * Handle PayU webhooks and callbacks
 */
router.post('/payu', async (req: Request, res: Response) => {
  try {
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      mihpayid,
      status,
      hash,
      phone,
      mode
    } = req.body;

    console.log('PayU webhook received:', {
      txnid,
      status,
      amount,
      email,
      mihpayid
    });

    // Verify hash for security
    const isValid = verifyPayUHash(req.body);
    if (!isValid) {
      console.error('Invalid PayU webhook hash');
      return res.status(400).json({ error: 'Invalid hash' });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.error('User not found for PayU webhook:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    if (status === 'success') {
      // Update user to pro tier
      await storage.updateUserTier(user.id, 'pro', {
        payuTransactionId: mihpayid,
        payuTxnId: txnid,
        paymentMethod: 'payu',
        paymentStatus: 'completed',
      });

      // Send payment confirmation email
      await emailService.sendPaymentConfirmation({
        customerName: firstname,
        customerEmail: email,
        amount: parseFloat(amount),
        currency: 'INR',
        transactionId: mihpayid || txnid,
        tier: 'pro',
        paymentMethod: `PayU (${mode})`,
        date: new Date(),
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(email, firstname, 'pro');

      console.log(`PayU: User ${user.id} upgraded to pro tier`);
    } else {
      // Payment failed
      await emailService.sendPaymentFailureNotification(
        email,
        firstname,
        `Payment ${status}: ${req.body.error_Message || 'Payment processing failed'}`
      );

      console.log(`PayU: Payment failed for user ${user.id}, status: ${status}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('PayU webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhooks (already implemented in stripe.ts, but can be moved here)
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripeService.verifyWebhookSignature(req.body, sig);

    console.log('Stripe webhook received:', {
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case 'checkout.session.completed':
        await handleStripeCheckoutCompleted(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await handleStripeSubscriptionDeleted(event.data.object as any);
        break;
      case 'invoice.payment_succeeded':
        await handleStripePaymentSucceeded(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await handleStripePaymentFailed(event.data.object as any);
        break;
      default:
        console.log(`Unhandled Stripe webhook: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

/**
 * Verify PayU hash for security
 */
function verifyPayUHash(data: any): boolean {
  try {
    const merchantSalt = process.env.PAYU_MERCHANT_SALT || '6pSdSll7fkWxuRBbTESjJVztSp7wVGFD';
    
    // PayU response hash formula is different from request hash
    const responseHashString = `${merchantSalt}|${data.status}|||||||||||${data.email}|${data.firstname}|${data.productinfo}|${data.amount}|${data.txnid}|${data.key}`;
    const calculatedHash = crypto.createHash('sha512').update(responseHashString).digest('hex');
    
    return calculatedHash === data.hash;
  } catch (error) {
    console.error('Error verifying PayU hash:', error);
    return false;
  }
}

/**
 * Handle Stripe checkout completion
 */
async function handleStripeCheckoutCompleted(session: any) {
  try {
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier || 'pro';

    if (!userId) {
      console.error('No userId in Stripe session metadata');
      return;
    }

    await storage.updateUserTier(userId, tier, {
      stripeCustomerId: session.customer,
      stripeSessionId: session.id,
      paymentMethod: 'stripe',
      paymentStatus: 'active',
    });

    const user = await storage.getUserById(userId);
    if (user) {
      await emailService.sendPaymentConfirmation({
        customerName: user.displayName || user.email.split('@')[0],
        customerEmail: user.email,
        amount: session.amount_total / 100,
        currency: session.currency,
        transactionId: session.id,
        tier,
        paymentMethod: 'Stripe',
        date: new Date(),
      });

      await emailService.sendWelcomeEmail(user.email, user.displayName || user.email.split('@')[0], tier);
    }

    console.log(`Stripe: User ${userId} upgraded to ${tier} tier`);
  } catch (error) {
    console.error('Error handling Stripe checkout:', error);
  }
}

/**
 * Handle Stripe subscription deletion
 */
async function handleStripeSubscriptionDeleted(subscription: any) {
  try {
    const user = await storage.getUserByStripeSubscriptionId(subscription.id);
    if (user) {
      await storage.updateUserTier(user.id, 'free', {
        stripeSubscriptionId: null,
        paymentStatus: 'canceled',
      });
      console.log(`Stripe: User ${user.id} downgraded to free tier`);
    }
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

/**
 * Handle successful Stripe payment
 */
async function handleStripePaymentSucceeded(invoice: any) {
  try {
    if (invoice.subscription) {
      const user = await storage.getUserByStripeSubscriptionId(invoice.subscription);
      if (user && user.tier !== 'pro') {
        await storage.updateUserTier(user.id, 'pro', {
          paymentStatus: 'active',
        });
        console.log(`Stripe: User ${user.id} tier maintained as pro`);
      }
    }
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

/**
 * Handle failed Stripe payment
 */
async function handleStripePaymentFailed(invoice: any) {
  try {
    if (invoice.subscription) {
      const user = await storage.getUserByStripeSubscriptionId(invoice.subscription);
      if (user) {
        await emailService.sendPaymentFailureNotification(
          user.email,
          user.displayName || user.email.split('@')[0],
          'Payment method declined or insufficient funds'
        );
        console.log(`Stripe: Payment failure notification sent to ${user.id}`);
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

export default router;