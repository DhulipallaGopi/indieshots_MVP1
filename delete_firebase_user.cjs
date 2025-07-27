// Script to delete a Firebase user by email for testing purposes
const admin = require('firebase-admin');
const fs = require('fs');

const targetEmail = 'gopichandudhulipalla@gmail.com';

async function deleteFirebaseUserByEmail() {
  try {
    console.log('🔥 Firebase User Deletion Script');
    console.log('===============================');
    console.log(`Target email: ${targetEmail}`);
    
    // Initialize Firebase Admin (using existing service account)
    const serviceAccountPath = './firebase-service-account.json';
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.log('❌ Firebase service account file not found');
      console.log('   Creating from environment variables...');
      
      // Create service account file from environment variables
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "indieshots-c6bb1",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token"
      };
      
      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        console.log('❌ Firebase environment variables not configured');
        console.log('   Cannot delete user without Firebase Admin SDK access');
        return;
      }
      
      fs.writeFileSync(serviceAccountPath, JSON.stringify(serviceAccount, null, 2));
      console.log('✅ Service account file created');
    }
    
    // Initialize Firebase Admin
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    
    const auth = admin.auth();
    console.log('✅ Firebase Admin initialized');
    
    // Find user by email
    console.log('🔍 Searching for user...');
    let userRecord;
    
    try {
      userRecord = await auth.getUserByEmail(targetEmail);
      console.log(`✅ User found: ${userRecord.uid}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Created: ${userRecord.metadata.creationTime}`);
      console.log(`   Provider: ${userRecord.providerData[0]?.providerId || 'email'}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('✅ User not found in Firebase - email is available for registration');
        return;
      } else {
        console.log('❌ Error finding user:', error.message);
        return;
      }
    }
    
    // Delete the user
    console.log('🗑️  Deleting user from Firebase...');
    try {
      await auth.deleteUser(userRecord.uid);
      console.log('✅ User deleted successfully from Firebase');
      console.log(`   ${targetEmail} is now available for fresh registration`);
      
      // Also check and clean any database records with this Firebase UID
      console.log('🔍 Checking for any database records...');
      const { db } = require('./server/db');
      const { sql } = require('drizzle-orm');
      
      // Check for any records in user_quotas with this user ID
      const quotaResult = await db.execute(sql`
        SELECT user_id FROM user_quotas WHERE user_id = ${userRecord.uid}
      `);
      
      if (quotaResult.rows.length > 0) {
        console.log('🗑️  Removing quota records...');
        await db.execute(sql`
          DELETE FROM user_quotas WHERE user_id = ${userRecord.uid}
        `);
        console.log('✅ Quota records cleaned');
      }
      
      // Check for any scripts
      const scriptsResult = await db.execute(sql`
        SELECT id FROM scripts WHERE user_id = ${userRecord.uid}
      `);
      
      if (scriptsResult.rows.length > 0) {
        console.log('🗑️  Removing script records...');
        await db.execute(sql`
          DELETE FROM scripts WHERE user_id = ${userRecord.uid}
        `);
        console.log('✅ Script records cleaned');
      }
      
      console.log('🎉 Complete cleanup finished - email is ready for fresh registration');
      
    } catch (error) {
      console.log('❌ Error deleting user:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Run the deletion
deleteFirebaseUserByEmail();