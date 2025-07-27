import { OpenAI } from 'openai';

async function debugQuotaIssue() {
  console.log('Debugging OpenAI quota issue...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API Key prefix:', apiKey?.substring(0, 20) + '...');
  
  const client = new OpenAI({ apiKey });
  
  // Test with different models to see which ones work
  const modelsToTest = ['gpt-3.5-turbo', 'gpt-4o-mini', 'gpt-4o', 'gpt-4'];
  
  for (const model of modelsToTest) {
    try {
      console.log(`\nTesting ${model}...`);
      
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      });
      
      console.log(`✅ ${model} works! Response:`, response.choices[0].message.content);
      console.log(`Usage:`, response.usage);
      
    } catch (error) {
      console.log(`❌ ${model} failed:`, error.status, error.message);
    }
  }
  
  // Test account limits
  try {
    console.log('\nChecking account info...');
    const models = await client.models.list();
    console.log('Available models count:', models.data.length);
    console.log('First few models:', models.data.slice(0, 5).map(m => m.id));
  } catch (error) {
    console.log('❌ Cannot list models:', error.message);
  }
}

debugQuotaIssue().catch(console.error);