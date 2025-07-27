// Debug test with more detailed logging
const fetch = require('node-fetch');

const testCouponDebug = async () => {
  console.log('=== DEBUGGING INDIE2025 COUPON ===');
  
  const testData = {
    idToken: 'test-token-123',
    provider: 'password', 
    providerUserId: 'debug-user-456',
    email: 'debug@test.com',
    displayName: 'Debug User',
    photoURL: null,
    couponCode: 'INDIE2025'
  };
  
  console.log('Sending test data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/firebase-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    // Check specific fields
    console.log('\n=== ANALYSIS ===');
    console.log('Expected tier: pro');
    console.log('Actual tier:', result.tier);
    console.log('Expected totalPages: -1 (unlimited)');
    console.log('Actual totalPages:', result.totalPages);
    console.log('Expected canGenerateStoryboards: true');
    console.log('Actual canGenerateStoryboards:', result.canGenerateStoryboards);
    
    if (result.tier === 'pro' && result.totalPages === -1) {
      console.log('✅ COUPON CODE WORKING CORRECTLY');
    } else {
      console.log('❌ COUPON CODE NOT WORKING');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testCouponDebug();