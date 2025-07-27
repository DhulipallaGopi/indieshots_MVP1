const { OpenAI } = require('openai');

async function checkOpenAIQuota() {
  console.log('🔍 Checking OpenAI API Quota Status');
  console.log('===================================');

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    return;
  }

  console.log('✅ API Key found:', apiKey.substring(0, 20) + '...');

  const openai = new OpenAI({
    apiKey: apiKey,
    timeout: 30000
  });

  try {
    // Test 1: Check if we can list models (basic API access)
    console.log('\n📋 Test 1: Checking basic API access...');
    const models = await openai.models.list();
    console.log('✅ API access working - found', models.data.length, 'models');

    // Test 2: Simple text completion (GPT-4)
    console.log('\n💬 Test 2: Testing GPT-4 text completion...');
    const textResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say "quota test successful"' }],
      max_tokens: 10
    });
    console.log('✅ GPT-4 working:', textResponse.choices[0].message.content);
    console.log('📊 Usage:', textResponse.usage);

    // Test 3: DALL-E 3 Image Generation (the main issue)
    console.log('\n🎨 Test 3: Testing DALL-E 3 image generation...');
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A simple test image of a red circle on white background',
      size: '1024x1024',
      quality: 'standard',
      n: 1
    });

    if (imageResponse.data && imageResponse.data[0] && imageResponse.data[0].url) {
      console.log('✅ DALL-E 3 working! Image URL received');

      // Test 4: Image download
      console.log('\n📥 Test 4: Testing image download...');
      const fetch = (await import('node-fetch')).default;
      const downloadResponse = await fetch(imageResponse.data[0].url);
      if (downloadResponse.ok) {
        const buffer = await downloadResponse.buffer();
        console.log('✅ Image download successful, size:', buffer.length, 'bytes');
      } else {
        console.log('❌ Image download failed:', downloadResponse.status, downloadResponse.statusText);
      }
    } else {
      console.log('❌ No image URL in response');
    }

    console.log('\n🎉 ALL TESTS PASSED - OpenAI API is working correctly with sufficient quota');

  } catch (error) {
    console.error('\n❌ OpenAI API Error Detected:');
    console.error('Type:', error.constructor?.name);
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);

    // Analyze the specific error
    if (error.status === 429) {
      console.log('\n🚨 QUOTA LIMIT EXCEEDED');
      console.log('Your OpenAI API usage has exceeded the rate limits or monthly quota.');
      console.log('Solutions:');
      console.log('- Wait for the rate limit to reset');
      console.log('- Check your OpenAI usage dashboard');
      console.log('- Upgrade your OpenAI plan if needed');
    } else if (error.status === 401) {
      console.log('\n🚨 AUTHENTICATION ERROR');
      console.log('Your API key is invalid or has been revoked.');
    } else if (error.status === 400 && error.type === 'image_generation_user_error') {
      console.log('\n🚨 DALL-E 3 ACCESS ERROR');
      console.log('Your API key does not have access to DALL-E 3 image generation.');
      console.log('This requires a paid OpenAI account with image generation permissions.');
    } else if (error.code === 'insufficient_quota') {
      console.log('\n🚨 INSUFFICIENT QUOTA');
      console.log('Your OpenAI account has run out of credits.');
      console.log('Add more credits to your OpenAI account to continue.');
    } else {
      console.log('\n❓ UNKNOWN ERROR');
      console.log('An unexpected error occurred. Check the error details above.');
    }
  }
}

// Run the quota check
checkOpenAIQuota().catch(console.error);