const env = require('./env');

module.exports = {
  apiKey: env.ai.openaiApiKey,
  defaultModel: 'gpt-4o',
  fastModel: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1'
};
