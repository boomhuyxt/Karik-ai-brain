const env = require('../src/config/env');

async function listModels() {
  const apiKey = env.ai.tokenrouterApiKey;
  const baseUrl = env.ai.tokenrouterBaseUrl;

  console.log('🔍 Listing available models from TokenRouter...');
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    const data = await res.json();
    console.log('Models response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

listModels();
