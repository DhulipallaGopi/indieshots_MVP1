import { OpenAI } from 'openai';

async function checkOpenAIQuota() {
  try {
    console.log('🔍 Checking OpenAI API quota and limits...');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test basic API connectivity
    console.log('📡 Testing basic API connectivity...');
    try {
      const models = await openai.models.list();
      console.log('✅ API connection successful');
      console.log('📋 Available models:', models.data.slice(0, 3).map(m => m.id));
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      return;
    }

    // Test DALL-E 3 access specifically
    console.log('🎨 Testing DALL-E 3 access...');
    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: 'A simple red circle on white background',
        size: '1024x1024',
        quality: 'standard',
        n: 1
      });
      
      if (response.data && response.data[0] && response.data[0].url) {
        console.log('✅ DALL-E 3 access confirmed');
        console.log('🖼️  Test image URL:', response.data[0].url);
      } else {
        console.log('⚠️  DALL-E 3 response structure unexpected:', response);
      }
    } catch (error) {
      console.error('❌ DALL-E 3 access failed:', error.message);
      console.error('Error type:', error.constructor.name);
      console.error('Error code:', error.code);
      console.error('Error status:', error.status);
      
      if (error.message.includes('billing')) {
        console.log('💳 This appears to be a billing/quota issue');
      }
      if (error.message.includes('insufficient_quota')) {
        console.log('📊 Quota exceeded - need to add credits to OpenAI account');
      }
      if (error.message.includes('image_generation_user_error')) {
        console.log('🚫 API key lacks image generation permissions');
      }
    }

    // Test GPT-4 access
    console.log('🤖 Testing GPT-4 access...');
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Say "API working"' }],
        max_tokens: 10
      });
      
      if (completion.choices && completion.choices[0]) {
        console.log('✅ GPT-4 access confirmed');
        console.log('💬 Response:', completion.choices[0].message.content);
      }
    } catch (error) {
      console.error('❌ GPT-4 access failed:', error.message);
    }

  } catch (error) {
    console.error('💥 General error:', error);
  }
}

// Run the check
checkOpenAIQuota();