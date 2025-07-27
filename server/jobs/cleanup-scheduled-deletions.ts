/**
 * Background job to automatically delete accounts that have been scheduled for deletion
 * and have passed their 30-day grace period.
 */

import { storage } from '../storage';

export async function cleanupScheduledDeletions() {
  console.log('Starting cleanup of scheduled account deletions...');
  
  try {
    // Get all users pending deletion whose grace period has expired
    const usersToDelete = await storage.getUsersPendingDeletion();
    
    if (usersToDelete.length === 0) {
      console.log('No accounts scheduled for deletion found.');
      return;
    }
    
    console.log(`Found ${usersToDelete.length} accounts to delete permanently.`);
    
    for (const user of usersToDelete) {
      try {
        console.log(`Deleting expired account: ${user.email} (scheduled: ${user.deletionScheduledAt})`);
        
        // Delete all user data from database
        // 1. First get all user's scripts
        const userScripts = await storage.getUserScripts(user.providerId || user.id.toString());
        
        // 2. For each script, delete its parse jobs first (which will cascade to delete shots)
        for (const script of userScripts) {
          await storage.deleteParseJobsForScript(script.id);
        }
        
        // 3. Then delete the scripts (now safe since parse jobs are gone)
        for (const script of userScripts) {
          await storage.deleteScript(script.id);
        }
        
        // Delete user quota record if exists
        try {
          const { ProductionQuotaManager } = await import('../lib/productionQuotaManager');
          const quotaManager = new ProductionQuotaManager();
          await quotaManager.deleteUserQuota(user.providerId || user.id.toString());
        } catch (error) {
          console.log('No quota record found for user:', user.email);
        }

        // Delete promo code usage records for this user
        try {
          const { PromoCodeService } = await import('../services/promoCodeService');
          if (user.email) {
            await PromoCodeService.deleteUserPromoCodeUsage(user.email);
            console.log('Deleted promo code usage records for user:', user.email);
          }
        } catch (error) {
          console.log('No promo code usage records found for user:', user.email);
        }

        // Delete any script health analysis records
        try {
          await storage.deleteScriptHealthAnalysisForUser(user.providerId || user.id.toString());
          console.log('Deleted script health analysis records for user:', user.email);
        } catch (error) {
          console.log('No script health analysis records found for user:', user.email);
        }

        // Delete any session records for this user
        try {
          await storage.deleteUserSessions(user.providerId || user.id.toString());
          console.log('Deleted session records for user:', user.email);
        } catch (error) {
          console.log('No session records found for user:', user.email);
        }
        
        // Delete user from Firebase - use direct Firebase Admin import
        try {
          const admin = await import('firebase-admin');
          const firebaseAdmin = admin.default;
          
          if (!firebaseAdmin.apps.length) {
            console.error('Firebase not initialized - skipping Firebase user deletion');
          } else {
            let firebaseUserDeleted = false;
            
            // Approach 1: Try with Firebase UID (stored in providerId) 
            if (user.providerId) {
              try {
                console.log('Attempting to delete Firebase user with UID:', user.providerId, 'for email:', user.email);
                await firebaseAdmin.auth().deleteUser(user.providerId);
                firebaseUserDeleted = true;
                console.log('User deleted from Firebase using UID:', user.email);
              } catch (error: any) {
                console.log('Failed to delete with UID, trying email approach:', error.message);
              }
            }
            
            // Approach 2: If UID deletion failed, try getting user by email first
            if (!firebaseUserDeleted) {
              try {
                console.log('Attempting to delete Firebase user by email:', user.email);
                const firebaseUser = await firebaseAdmin.auth().getUserByEmail(user.email);
                await firebaseAdmin.auth().deleteUser(firebaseUser.uid);
                firebaseUserDeleted = true;
                console.log('User deleted from Firebase using email lookup:', user.email);
              } catch (error: any) {
                if (error.code === 'auth/user-not-found') {
                  console.log('User not found in Firebase (already deleted):', user.email);
                  firebaseUserDeleted = true; // Consider this success
                } else {
                  console.error('Failed to delete Firebase user by email:', error.message);
                }
              }
            }
            
            // Verify deletion by trying to get the user again
            if (firebaseUserDeleted) {
              try {
                await firebaseAdmin.auth().getUserByEmail(user.email);
                console.error('WARNING: User still exists in Firebase after deletion!');
              } catch (verifyError: any) {
                if (verifyError.code === 'auth/user-not-found') {
                  console.log('VERIFIED: User completely removed from Firebase:', user.email);
                }
              }
            }
          }
          
        } catch (error: any) {
          console.error('Error deleting user from Firebase:', error);
          // Continue with database deletion even if Firebase deletion fails
          console.error('Firebase deletion failed but continuing with database deletion:', error.message);
        }
        
        // Finally delete the user account from database
        await storage.deleteUser(user.providerId || user.id.toString());
        
        console.log(`Successfully deleted account: ${user.email}`);
        
      } catch (error) {
        console.error(`Failed to delete account ${user.email}:`, error);
        // Continue with other users even if one fails
      }
    }
    
    console.log('Cleanup of scheduled deletions completed.');
    
  } catch (error) {
    console.error('Error during cleanup of scheduled deletions:', error);
  }
}

// Function to start the cleanup job with cron-like scheduling
export function startCleanupJob() {
  // Run cleanup every 24 hours (86400000 ms)
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;
  
  console.log('Starting scheduled deletion cleanup job (runs every 24 hours)...');
  
  // Run immediately on startup
  cleanupScheduledDeletions();
  
  // Then run every 24 hours
  setInterval(() => {
    cleanupScheduledDeletions();
  }, CLEANUP_INTERVAL);
}