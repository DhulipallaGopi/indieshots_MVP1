/**
 * Debug script to test OpenAI API and storyboard generation
 */
import { OpenAI } from 'openai';

async function testOpenAIConnection() {
  try {
    console.log('🔍 Testing OpenAI API connection...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      return;
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('✅ OpenAI client initialized');
    
    // Test simple text completion first
    console.log('📝 Testing text completion...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    });
    
    console.log('✅ Text completion works:', completion.choices[0].message.content);
    
    // Test image generation
    console.log('🎨 Testing image generation...');
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A simple test image, professional film production still',
      size: '1792x1024',
      quality: 'standard',
      n: 1
    });
    
    console.log('✅ Image generation works:', imageResponse.data[0].url);
    
    // Test image download
    console.log('📥 Testing image download...');
    const imageUrl = imageResponse.data[0].url;
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'IndieShots-Debug/1.0'
      }
    });
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log('✅ Image download successful, size:', buffer.length, 'bytes');
    } else {
      console.error('❌ Image download failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ OpenAI API test failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
  }
}

// Run the test
testOpenAIConnection().catch(console.error);