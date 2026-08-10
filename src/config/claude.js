const env = require('./env');

module.exports = {
  apiKey: env.ai.claudeApiKey,
  defaultModel: 'claude-3-5-sonnet-20241022',
  baseUrl: 'https://api.anthropic.com/v1'
};
