// Delete user by email using existing Firebase admin setup
const targetEmail = 'gopichandudhulipalla@gmail.com';

async function cleanupUserEmail() {
  try {
    console.log('🧹 Email Cleanup Script');
    console.log('=======================');
    console.log(`Target email: ${targetEmail}`);
    
    // Import Firebase admin using the existing setup
    const { auth: firebaseAdmin } = await import('./server/firebase/admin.js');
    
    console.log('✅ Firebase admin loaded');
    
    // Try to find and delete the user
    try {
      console.log('🔍 Searching for user in Firebase...');
      const userRecord = await firebaseAdmin.getUserByEmail(targetEmail);
      
      console.log(`✅ User found: ${userRecord.uid}`);
      console.log(`   Email: ${userRecord.email}`);
      console.log(`   Created: ${userRecord.metadata.creationTime}`);
      
      // Delete the user
      console.log('🗑️  Deleting user from Firebase...');
      await firebaseAdmin.deleteUser(userRecord.uid);
      console.log('✅ User deleted from Firebase');
      
      // Clean up any database records
      console.log('🔍 Cleaning database records...');
      const { db } = await import('./server/db.js');
      const { sql } = await import('drizzle-orm');
      
      // Clean quota records
      await db.execute(sql`DELETE FROM user_quotas WHERE user_id = ${userRecord.uid}`);
      
      // Clean script records  
      await db.execute(sql`DELETE FROM scripts WHERE user_id = ${userRecord.uid}`);
      
      // Clean parse job records
      await db.execute(sql`DELETE FROM parse_jobs WHERE user_id = ${userRecord.uid}`);
      
      console.log('✅ Database records cleaned');
      console.log('🎉 Email cleanup complete - ready for fresh registration');
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('✅ No user found in Firebase with this email');
        console.log('   Email is already available for registration');
      } else {
        console.log('❌ Error accessing Firebase:', error.message);
        console.log('   This might be due to insufficient Firebase permissions');
        
        // Still clean any database records just in case
        console.log('🔍 Checking database anyway...');
        const { db } = await import('./server/db.js');
        const { sql } = await import('drizzle-orm');
        
        // Check for any user records with this email
        const userCheck = await db.execute(sql`
          SELECT * FROM users WHERE email = ${targetEmail}
        `);
        
        if (userCheck.rows.length > 0) {
          console.log('🗑️  Found database records, cleaning...');
          const userId = userCheck.rows[0].id;
          const providerId = userCheck.rows[0].provider_id;
          
          // Clean all related records
          await db.execute(sql`DELETE FROM user_quotas WHERE user_id = ${providerId || userId}`);
          await db.execute(sql`DELETE FROM scripts WHERE user_id = ${providerId || userId}`);
          await db.execute(sql`DELETE FROM parse_jobs WHERE user_id = ${providerId || userId}`);
          await db.execute(sql`DELETE FROM users WHERE email = ${targetEmail}`);
          
          console.log('✅ Database records cleaned');
        }
        
        console.log('✅ Email should now be available for registration');
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.log('   Manual database cleanup required');
  }
}

cleanupUserEmail();