const env = require('./env');

module.exports = {
  apiKey: env.ai.openrouterApiKey,
  defaultModel: 'anthropic/claude-3.5-sonnet',
  baseUrl: 'https://openrouter.ai/api/v1'
};
