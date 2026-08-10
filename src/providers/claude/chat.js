const claudeConfig = require('../../config/claude');

async function chat(prompt, options = {}) {
  if (!claudeConfig.apiKey) {
    return `[Claude Mock Response]: Comprehensive analysis for "${prompt}"`;
  }
  try {
    const response = await fetch(`${claudeConfig.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeConfig.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || claudeConfig.defaultModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || 'No response from Claude';
    const usage = data?.usage ? {
      inputTokens: data.usage.input_tokens || 0,
      outputTokens: data.usage.output_tokens || 0,
      totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
    } : null;
    return { text, usage };
  } catch (err) {
    return { text: `[Claude Error Fallback]: ${err.message}`, usage: null };
  }
}

module.exports = { chat };
