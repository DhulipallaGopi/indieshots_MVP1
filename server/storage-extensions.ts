import { users, type User } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Payment-related storage methods
export class PaymentStorage {
  // Additional user operations for payment system
  async getUserById(id: string): Promise<User | undefined> {
    // Try to find by Firebase UID (string ID) or numeric ID
    let user;
    
    // First try Firebase UID
    const [userByFirebaseId] = await db.select().from(users).where(eq(users.firebaseUID, id));
    if (userByFirebaseId) {
      user = userByFirebaseId;
    } else {
      // Try numeric ID conversion
      const numericId = parseInt(id);
      if (!isNaN(numericId)) {
        const [userByNumericId] = await db.select().from(users).where(eq(users.id, numericId));
        user = userByNumericId;
      }
    }
    
    if (!user) return undefined;
    
    // Apply same special handling as getUserByEmail
    return this.applyUserSpecialHandling(user);
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user ? this.applyUserSpecialHandling(user) : undefined;
  }

  async updateUserTier(userId: string, tier: string, paymentInfo?: any): Promise<User> {
    // Find user first
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prepare tier-specific updates
    const tierUpdates = {
      tier,
      ...(tier === 'pro' && {
        totalPages: -1,
        maxShotsPerScene: -1,
        canGenerateStoryboards: true,
      }),
      ...(tier === 'free' && {
        totalPages: 10,
        maxShotsPerScene: 5,
        canGenerateStoryboards: false,
      }),
      ...paymentInfo,
    };

    // Update in database using numeric ID
    const [updatedUser] = await db
      .update(users)
      .set(tierUpdates)
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      throw new Error('Failed to update user tier');
    }

    console.log(`User ${userId} tier updated to ${tier}`);
    return updatedUser;
  }

  async getUserPaymentHistory(userId: string): Promise<any[]> {
    // Import the payment transaction service
    const { paymentTransactionService } = await import('./services/paymentTransactionService.js');
    
    // Get payment history from dedicated transactions table
    const transactions = await paymentTransactionService.getUserPaymentHistory(userId);
    
    // Convert to display format
    const history = transactions.map(transaction => ({
      id: transaction.transactionId,
      method: transaction.paymentMethod,
      status: transaction.status,
      amount: transaction.amount / 100, // Convert from paise to rupees
      currency: transaction.currency.toLowerCase(),
      date: transaction.createdAt,
      description: `IndieShots Pro Plan (${transaction.paymentMethod.toUpperCase()})`
    }));

    // Fallback: if no transactions found, check user record for legacy data
    if (history.length === 0) {
      const user = await this.getUserById(userId);
      if (!user) return [];

      // Add legacy Stripe payment info if available
      if (user.stripeCustomerId || user.stripeSubscriptionId) {
        history.push({
          id: user.stripeSubscriptionId || user.stripeCustomerId,
          method: 'stripe',
          status: user.paymentStatus || 'active',
          amount: 999, // Updated to ₹999
          currency: 'inr',
          date: user.updatedAt || user.createdAt,
          description: 'IndieShots Pro Plan (Legacy)'
        });
      }

      // Add legacy PayU payment info if available
      if (user.payuTransactionId || user.payuTxnId) {
        history.push({
          id: user.payuTransactionId || user.payuTxnId,
          method: 'payu',
          status: user.paymentStatus || 'completed',
          amount: 999, // Updated to ₹999
          currency: 'inr',
          date: user.updatedAt || user.createdAt,
          description: 'IndieShots Pro Plan (Legacy)'
        });
      }
    }

    return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // Helper method to apply special user handling (extracted from existing code)
  private applyUserSpecialHandling(user: User): User {
    // Special handling for premium demo account and critical INDIE2025 accounts
    const criticalProAccounts = [
      'premium@demo.com',
      'dhulipallagopichandu@gmail.com', 
      'gopichandudhulipalla@gmail.com'
    ];
    
    if (user.email && criticalProAccounts.includes(user.email)) {
      return {
        ...user,
        tier: 'pro',
        totalPages: -1,
        maxShotsPerScene: -1,
        canGenerateStoryboards: true
      };
    }

    return user;
  }
}