const env = require('./env');

module.exports = {
  apiKey: env.ai.groqApiKey,
  defaultModel: 'llama-3.3-70b-versatile',
  fastModel: 'llama-3.1-8b-instant',
  baseUrl: 'https://api.groq.com/openai/v1'
};
