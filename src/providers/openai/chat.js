const openaiConfig = require('../../config/openai');
const systemPrompt = require('../../prompts/system.prompt');

async function chat(prompt, options = {}) {
  if (!openaiConfig.apiKey) {
    return `[ChatGPT Mock Response]: Processing request for "${prompt}"`;
  }
  try {
    const response = await fetch(`${openaiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || openaiConfig.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt.systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || 'No response from ChatGPT';
    const usage = data?.usage ? {
      inputTokens: data.usage.prompt_tokens || 0,
      outputTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0
    } : null;
    return { text, usage };
  } catch (err) {
    return { text: `[ChatGPT Error Fallback]: ${err.message}`, usage: null };
  }
}

module.exports = { chat };
