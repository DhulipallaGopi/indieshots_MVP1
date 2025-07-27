#!/usr/bin/env node

/**
 * Debug OpenAI API to identify the root cause of 500 errors
 */

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIConnection() {
  console.log('🧪 Testing OpenAI API Connection');
  console.log('=================================');
  
  try {
    // Test 1: Simple GPT-4 text completion
    console.log('Test 1: GPT-4 Text Completion');
    const textResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say "hello world"' }],
      max_tokens: 10
    });
    console.log('✅ GPT-4 Response:', textResponse.choices[0].message.content);
    
    // Test 2: DALL-E 3 Image Generation
    console.log('\nTest 2: DALL-E 3 Image Generation');
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'A simple red circle',
      size: '1024x1024',
      quality: 'standard',
      n: 1
    });
    console.log('✅ DALL-E 3 Response:', imageResponse.data[0].url ? 'Image URL received' : 'No image URL');
    
    // Test 3: Download image
    console.log('\nTest 3: Image Download');
    const downloadResponse = await fetch(imageResponse.data[0].url);
    console.log('✅ Image Download:', downloadResponse.ok ? 'Success' : 'Failed');
    
    console.log('\n🎉 ALL TESTS PASSED - OpenAI API is working correctly');
    
  } catch (error) {
    console.error('\n❌ OpenAI API Error:', {
      type: error.constructor?.name,
      message: error.message,
      status: error.status,
      code: error.code,
      error: error.error
    });
    
    // Check if it's a non-JSON response
    if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      console.error('🚨 NON-JSON RESPONSE DETECTED - This is the root cause of 500 errors');
      console.error('Error details:', error.stack);
    }
  }
}

testOpenAIConnection();