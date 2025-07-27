// Test the complete promo code flow with script upload
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test with the specific user who was having issues
const testUserId = 'r3eY2BPKVrQy6WKm9UujQgHuZHM2';
const testEmail = 'promouser@example.com';

async function testPromoCodeUserFlow() {
  console.log('🧪 Testing Complete Promo Code User Flow');
  console.log('========================================');
  console.log(`User ID: ${testUserId}`);
  console.log(`Email: ${testEmail}`);
  console.log('');

  try {
    // Step 1: Create a JWT token for the user (simulating authenticated session)
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    const token = jwt.sign(
      { 
        uid: testUserId,  // Firebase UID
        email: testEmail,
        tier: 'pro'  // Pro tier from promo code
      },
      secret,
      { expiresIn: '1h' }
    );
    
    console.log('1️⃣ Created test JWT token for pro user');
    
    // Step 2: Check user quota status
    console.log('2️⃣ Checking user quota status...');
    const quotaResponse = await makeRequest('GET', '/api/test/quota-status', null, token);
    
    if (quotaResponse.success) {
      const quota = quotaResponse.data.quota;
      console.log(`   ✅ Quota retrieved successfully`);
      console.log(`   Tier: ${quota.tier}`);
      console.log(`   Total Pages: ${quota.totalPages} (${quota.totalPages === -1 ? 'Unlimited' : 'Limited'})`);
      console.log(`   Used Pages: ${quota.usedPages}`);
      console.log(`   Max Shots: ${quota.maxShotsPerScene} (${quota.maxShotsPerScene === -1 ? 'Unlimited' : 'Limited'})`);
      console.log(`   Storyboards: ${quota.canGenerateStoryboards ? 'Enabled' : 'Disabled'}`);
      
      if (quota.tier === 'pro' && quota.totalPages === -1) {
        console.log('   ✅ User correctly has pro tier with unlimited pages!');
      } else {
        console.log('   ❌ User still has incorrect tier/limits');
        return;
      }
    } else {
      console.log('   ❌ Failed to get quota status:', quotaResponse.message);
      return;
    }
    
    // Step 3: Test script upload (the critical test)
    console.log('3️⃣ Testing script upload...');
    
    const testScriptContent = `FADE IN:

INT. COFFEE SHOP - DAY

Sarah sits at a corner table, typing furiously on her laptop. Steam rises from her untouched latte.

SARAH
(to herself)
Just one more page...

MARK enters, scanning the room before spotting Sarah.

MARK
You've been here for hours.

SARAH
(not looking up)
The deadline is tomorrow.

MARK
The deadline was yesterday.

Sarah finally looks up, panic in her eyes.

SARAH
What?

FADE OUT.`;

    const scriptData = {
      title: 'Test Promo Code Script',
      content: testScriptContent
    };
    
    const uploadResponse = await makeRequest('POST', '/api/scripts/upload', scriptData, token);
    
    if (uploadResponse.success) {
      console.log('   ✅ Script uploaded successfully!');
      console.log(`   Script ID: ${uploadResponse.data.script.id}`);
      console.log(`   Page Count: ${uploadResponse.data.script.pageCount}`);
      console.log(`   Parse Job ID: ${uploadResponse.data.parseJob.id}`);
      console.log('\n🎉 SUCCESS: Promo code user can now upload scripts without page limits!');
    } else {
      console.log('   ❌ Script upload failed:', uploadResponse.message);
      console.log('   Response:', uploadResponse.data);
      
      if (uploadResponse.message && uploadResponse.message.includes('Page limit exceeded')) {
        console.log('\n❌ ISSUE: User is still being treated as free tier despite promo code');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(`http://localhost:5000${path}`);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(responseBody);
          resolve({
            success: res.statusCode < 400,
            status: res.statusCode,
            message: data.message || 'Success',
            data: data
          });
        } catch (e) {
          resolve({
            success: false,
            status: res.statusCode,
            message: responseBody,
            data: responseBody
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        message: error.message
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

// Run the test
testPromoCodeUserFlow();