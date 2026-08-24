const tokenrouterConfig = require('../../config/tokenrouter');
const promptService = require('../../services/ai/prompt.service');

async function chat(prompt, options = {}) {
  if (!tokenrouterConfig.apiKey) {
    return `[TokenRouter Mock Response]: Model routing response for "${prompt}"`;
  }
  try {
    const response = await fetch(`${tokenrouterConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenrouterConfig.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || tokenrouterConfig.defaultModel,
        messages: [
          { role: 'system', content: promptService.systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP status ${response.status}`);
    }

    const text = data?.choices?.[0]?.message?.content || 'No response from TokenRouter';
    const usage = data?.usage ? {
      inputTokens: data.usage.prompt_tokens || 0,
      outputTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0
    } : null;

    return { text, usage };
  } catch (err) {
    return { text: `[TokenRouter Error Fallback]: ${err.message}`, usage: null };
  }
}

module.exports = { chat };
