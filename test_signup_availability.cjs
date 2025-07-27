// Test if gopichandudhulipalla@gmail.com can sign up
const https = require('https');
const http = require('http');

const testEmail = 'gopichandudhulipalla@gmail.com';

async function testSignupAvailability() {
  console.log('🧪 Testing Email Signup Availability');
  console.log('====================================');
  console.log(`Target email: ${testEmail}`);
  
  try {
    // Test signup to see what error we get
    const signupData = {
      email: testEmail,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    console.log('1️⃣ Testing signup...');
    const signupResponse = await makeRequest('POST', '/api/auth/hybrid-signup', signupData);
    
    console.log(`   Status: ${signupResponse.status}`);
    console.log(`   Message: ${signupResponse.message}`);
    
    if (signupResponse.success) {
      console.log('✅ Email is available for signup!');
    } else if (signupResponse.message && signupResponse.message.includes('already registered')) {
      console.log('❌ Email is registered in Firebase');
      console.log('   Need to delete from Firebase to make it available');
      
      // Try to trigger a password reset to confirm the user exists
      console.log('2️⃣ Confirming user exists...');
      const resetData = { email: testEmail };
      const resetResponse = await makeRequest('POST', '/api/auth/request-password-reset', resetData);
      
      console.log(`   Reset Status: ${resetResponse.status}`);
      console.log(`   Reset Message: ${resetResponse.message}`);
      
      if (resetResponse.success) {
        console.log('✅ User confirmed to exist in Firebase');
        console.log('   Manual Firebase deletion required');
      }
    } else {
      console.log('🤔 Unexpected response:', signupResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function makeRequest(method, path, body) {
  return new Promise((resolve) => {
    const url = new URL(`http://localhost:5000${path}`);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
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

testSignupAvailability();