/**
 * Comprehensive Firebase User Deletion Utility
 * Ensures complete removal of users from Firebase Authentication
 */

export interface FirebaseDeletionResult {
  success: boolean;
  method?: string;
  firebaseUID?: string;
  error?: string;
  verified: boolean;
}

export async function deleteFirebaseUser(
  email: string, 
  providerId?: string | null
): Promise<FirebaseDeletionResult> {
  console.log(`🔥 Starting Firebase user deletion for: ${email}`);
  console.log(`🔥 Provided Firebase UID: ${providerId || 'none'}`);
  
  try {
    // Import Firebase Admin
    const admin = await import('firebase-admin');
    const firebaseAdmin = admin.default;
    
    if (!firebaseAdmin.apps.length) {
      console.error('🔥 Firebase not initialized - cannot delete user');
      return {
        success: false,
        error: 'Firebase not initialized',
        verified: false
      };
    }
    
    let deletionSuccess = false;
    let usedMethod = '';
    let actualFirebaseUID = '';
    
    // Method 1: Try with provided Firebase UID
    if (providerId) {
      try {
        console.log(`🔥 Attempting deletion with provided UID: ${providerId}`);
        await firebaseAdmin.auth().deleteUser(providerId);
        deletionSuccess = true;
        usedMethod = 'providerId';
        actualFirebaseUID = providerId;
        console.log(`🔥 SUCCESS: User deleted using provided UID`);
      } catch (error: any) {
        console.log(`🔥 Failed to delete with provided UID: ${error.message}`);
      }
    }
    
    // Method 2: Try by looking up email first
    if (!deletionSuccess) {
      try {
        console.log(`🔥 Attempting email lookup for: ${email}`);
        const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
        actualFirebaseUID = userRecord.uid;
        console.log(`🔥 Found user with UID: ${actualFirebaseUID}`);
        
        await firebaseAdmin.auth().deleteUser(userRecord.uid);
        deletionSuccess = true;
        usedMethod = 'email-lookup';
        console.log(`🔥 SUCCESS: User deleted using email lookup`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`🔥 User not found in Firebase: ${email}`);
          return {
            success: true, // Consider user not found as success
            method: 'not-found',
            verified: true,
            error: 'User not found (already deleted)'
          };
        } else {
          console.error(`🔥 Error during email lookup: ${error.message}`);
        }
      }
    }
    
    // Verification: Ensure user is actually deleted
    let verificationPassed = false;
    if (deletionSuccess) {
      try {
        await firebaseAdmin.auth().getUserByEmail(email);
        console.error(`🔥 VERIFICATION FAILED: User still exists after deletion!`);
        verificationPassed = false;
      } catch (verifyError: any) {
        if (verifyError.code === 'auth/user-not-found') {
          console.log(`🔥 VERIFICATION PASSED: User confirmed deleted from Firebase`);
          verificationPassed = true;
        } else {
          console.error(`🔥 Verification error: ${verifyError.message}`);
          verificationPassed = false;
        }
      }
    }
    
    return {
      success: deletionSuccess,
      method: usedMethod,
      firebaseUID: actualFirebaseUID,
      verified: verificationPassed
    };
    
  } catch (error: any) {
    console.error(`🔥 Firebase deletion error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      verified: false
    };
  }
}

/**
 * List all Firebase users for debugging (admin only)
 */
export async function listFirebaseUsers(): Promise<any[]> {
  try {
    const admin = await import('firebase-admin');
    const firebaseAdmin = admin.default;
    
    if (!firebaseAdmin.apps.length) {
      throw new Error('Firebase not initialized');
    }
    
    const listUsers = await firebaseAdmin.auth().listUsers();
    return listUsers.users.map(user => ({
      uid: user.uid,
      email: user.email,
      disabled: user.disabled,
      emailVerified: user.emailVerified
    }));
    
  } catch (error: any) {
    console.error('Error listing Firebase users:', error);
    return [];
  }
}