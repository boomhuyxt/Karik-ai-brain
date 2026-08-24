const env = require('./env');

module.exports = {
  apiKey: env.ai.tokenrouterApiKey,
  baseUrl: env.ai.tokenrouterBaseUrl,
  defaultModel: 'deepseek/deepseek-v4-pro-0813-free'
};
