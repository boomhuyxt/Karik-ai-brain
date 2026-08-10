const groqConfig = require('../../config/groq');

async function chat(prompt, options = {}) {
  if (!groqConfig.apiKey) {
    return `[Groq Instant Mock Response]: Processing request for "${prompt}"`;
  }
  try {
    const response = await fetch(`${groqConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqConfig.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || groqConfig.defaultModel,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || 'No response from Groq';
    const usage = data?.usage ? {
      inputTokens: data.usage.prompt_tokens || 0,
      outputTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0
    } : null;
    return { text, usage };
  } catch (err) {
    return { text: `[Groq Error Fallback]: ${err.message}`, usage: null };
  }
}

module.exports = { chat };
