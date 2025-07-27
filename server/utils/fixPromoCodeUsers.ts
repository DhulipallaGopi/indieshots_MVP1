import { auth as firebaseAdmin } from '../firebase/admin';
import { storage } from '../storage';

/**
 * Fix promo code users who have Firebase accounts but missing PostgreSQL records
 */
export async function fixPromoCodeUsers() {
  console.log('🔧 Starting promo code user sync fix...');
  
  // Get all promo code users who don't have PostgreSQL records
  const promoCodeUsers = [
    { email: 'krishnavarshitha04@gmail.com', uid: 'v6nYn8RrHkUronGtQB7soZoesUo1' },
    // Add other missing users if found
  ];
  
  const results = [];
  
  for (const userData of promoCodeUsers) {
    try {
      console.log(`Processing user: ${userData.email}`);
      
      // Check if user exists in PostgreSQL
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        console.log(`✓ User ${userData.email} already exists in PostgreSQL`);
        continue;
      }
      
      // Get Firebase user and custom claims
      const firebaseUser = await firebaseAdmin.getUserByEmail(userData.email);
      const customClaims = firebaseUser.customClaims || {};
      const tierFromFirebase = (customClaims as any).tier || 'pro'; // Default to pro for promo users
      
      console.log(`Firebase user found: ${userData.email}, tier: ${tierFromFirebase}`);
      
      // Create PostgreSQL user with correct tier
      const newUser = await storage.createUser({
        email: userData.email.toLowerCase(),
        firstName: userData.email.split('@')[0],
        lastName: '',
        provider: 'password',
        providerId: firebaseUser.uid,
        emailVerified: firebaseUser.emailVerified || false,
        tier: tierFromFirebase,
        totalPages: tierFromFirebase === 'pro' ? -1 : 10,
        usedPages: 0,
        maxShotsPerScene: tierFromFirebase === 'pro' ? -1 : 5,
        canGenerateStoryboards: tierFromFirebase === 'pro',
      });
      
      console.log(`✅ Created PostgreSQL user: ${newUser.email} with tier: ${newUser.tier}`);
      results.push({ email: userData.email, status: 'created', tier: newUser.tier });
      
    } catch (error: any) {
      console.error(`❌ Failed to process ${userData.email}:`, error.message);
      results.push({ email: userData.email, status: 'error', error: error.message });
    }
  }
  
  console.log('🔧 Promo code user sync fix completed:', results);
  return results;
}