const geminiConfig = require('../../config/gemini');

async function getEmbedding(text) {
  if (!geminiConfig.apiKey) {
    // Return dummy 768-dim embedding vector
    return new Array(768).fill(0).map(() => Math.random());
  }
  try {
    const url = `${geminiConfig.baseUrl}/models/text-embedding-004:embedContent?key=${geminiConfig.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] }
      })
    });
    const data = await response.json();
    return data?.embedding?.values || new Array(768).fill(0);
  } catch (err) {
    return new Array(768).fill(0);
  }
}

module.exports = { getEmbedding };
