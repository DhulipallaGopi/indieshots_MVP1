// Script to validate the promo code fix for dhulipallagopichandu@gmail.com

import { db } from './server/db.js';
import { users, promoCodeUsage, promoCodes } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function validatePromoFix() {
  console.log('=== Validating Promo Code Fix ===\n');

  try {
    // Check user account status
    const user = await db.select()
      .from(users)
      .where(eq(users.email, 'dhulipallagopichandu@gmail.com'))
      .limit(1);

    if (user.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const userData = user[0];
    console.log('User Account Status:');
    console.log(`Email: ${userData.email}`);
    console.log(`Tier: ${userData.tier}`);
    console.log(`Total Pages: ${userData.totalPages}`);
    console.log(`Max Shots Per Scene: ${userData.maxShotsPerScene}`);
    console.log(`Can Generate Storyboards: ${userData.canGenerateStoryboards}`);

    // Check promo code usage
    const promoUsage = await db.select({
      userEmail: promoCodeUsage.userEmail,
      usedAt: promoCodeUsage.usedAt,
      code: promoCodes.code
    })
    .from(promoCodeUsage)
    .innerJoin(promoCodes, eq(promoCodeUsage.promoCodeId, promoCodes.id))
    .where(eq(promoCodeUsage.userEmail, 'dhulipallagopichandu@gmail.com'));

    console.log('\nPromo Code Usage:');
    if (promoUsage.length > 0) {
      promoUsage.forEach(usage => {
        console.log(`✓ Used: ${usage.code} at ${usage.usedAt}`);
      });
    } else {
      console.log('❌ No promo code usage found');
    }

    // Validate fix
    const isFixed = (
      userData.tier === 'pro' &&
      userData.totalPages === -1 &&
      userData.maxShotsPerScene === -1 &&
      userData.canGenerateStoryboards === true &&
      promoUsage.length > 0 &&
      promoUsage[0].code === 'INDIE2025'
    );

    console.log('\n=== Validation Result ===');
    if (isFixed) {
      console.log('✅ PROMO CODE FIX SUCCESSFUL');
      console.log('✅ User has correct pro tier access');
      console.log('✅ INDIE2025 promo code is properly recorded');
      console.log('✅ Unlimited features are enabled');
    } else {
      console.log('❌ Fix incomplete or failed');
    }

  } catch (error) {
    console.error('Validation error:', error);
  }
}

validatePromoFix();