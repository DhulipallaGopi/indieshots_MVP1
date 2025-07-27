import { db } from '../db';
import { paymentTransactions, users, type PaymentTransaction, type InsertPaymentTransaction } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

export class PaymentTransactionService {
  /**
   * Record a new payment transaction attempt
   */
  async recordTransaction(data: {
    userId: string;
    email: string;
    transactionId: string;
    payuTxnId?: string;
    amount: number;
    currency?: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    paymentMethod: 'payu' | 'stripe';
    paymentGateway?: string;
    errorMessage?: string;
    metadata?: any;
  }): Promise<PaymentTransaction> {
    console.log(`🔄 PAYMENT TRACKING: Recording transaction ${data.transactionId} for ${data.email}`);
    
    const [transaction] = await db.insert(paymentTransactions).values({
      userId: data.userId,
      email: data.email,
      transactionId: data.transactionId,
      payuTxnId: data.payuTxnId,
      amount: data.amount,
      currency: data.currency || 'INR',
      status: data.status,
      paymentMethod: data.paymentMethod,
      paymentGateway: data.paymentGateway,
      errorMessage: data.errorMessage,
      metadata: data.metadata,
    }).returning();

    console.log(`✅ PAYMENT TRACKING: Transaction recorded with ID ${transaction.id}`);
    return transaction;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    transactionId: string, 
    status: 'pending' | 'success' | 'failed' | 'cancelled',
    errorMessage?: string
  ): Promise<PaymentTransaction | null> {
    console.log(`🔄 PAYMENT TRACKING: Updating transaction ${transactionId} to status: ${status}`);
    
    const [updatedTransaction] = await db
      .update(paymentTransactions)
      .set({ 
        status, 
        errorMessage,
        updatedAt: new Date() 
      })
      .where(eq(paymentTransactions.transactionId, transactionId))
      .returning();

    if (updatedTransaction) {
      console.log(`✅ PAYMENT TRACKING: Transaction ${transactionId} updated to ${status}`);
    } else {
      console.warn(`⚠️ PAYMENT TRACKING: Transaction ${transactionId} not found for update`);
    }

    return updatedTransaction || null;
  }

  /**
   * Get user's payment history (only successful transactions for display)
   */
  async getUserPaymentHistory(userId: string): Promise<PaymentTransaction[]> {
    const transactions = await db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.userId, userId),
          eq(paymentTransactions.status, 'success')
        )
      )
      .orderBy(desc(paymentTransactions.createdAt));

    console.log(`📊 PAYMENT TRACKING: Found ${transactions.length} successful transactions for user ${userId}`);
    return transactions;
  }

  /**
   * Get all payment attempts for a user (for admin/debugging)
   */
  async getAllUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    const transactions = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.userId, userId))
      .orderBy(desc(paymentTransactions.createdAt));

    console.log(`📊 PAYMENT TRACKING: Found ${transactions.length} total transactions for user ${userId}`);
    return transactions;
  }

  /**
   * Check if transaction already exists (to prevent duplicates)
   */
  async transactionExists(transactionId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.transactionId, transactionId))
      .limit(1);

    return !!existing;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.transactionId, transactionId))
      .limit(1);

    return transaction || null;
  }

  /**
   * Get payment statistics for a user
   */
  async getUserPaymentStats(userId: string): Promise<{
    totalAttempts: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmountPaid: number;
    lastSuccessfulPayment?: PaymentTransaction;
  }> {
    const allTransactions = await this.getAllUserTransactions(userId);
    const successfulTransactions = allTransactions.filter(t => t.status === 'success');
    const failedTransactions = allTransactions.filter(t => t.status === 'failed');
    
    const totalAmountPaid = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    const lastSuccessfulPayment = successfulTransactions[0]; // First in desc order

    return {
      totalAttempts: allTransactions.length,
      successfulPayments: successfulTransactions.length,
      failedPayments: failedTransactions.length,
      totalAmountPaid,
      lastSuccessfulPayment,
    };
  }

  /**
   * Clean up old failed transactions (optional maintenance)
   */
  async cleanupOldFailedTransactions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedTransactions = await db
      .delete(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.status, 'failed'),
          // @ts-ignore - Drizzle date comparison
          paymentTransactions.createdAt < cutoffDate
        )
      );

    console.log(`🧹 PAYMENT TRACKING: Cleaned up old failed transactions`);
    return deletedTransactions.rowCount || 0;
  }
}

export const paymentTransactionService = new PaymentTransactionService();