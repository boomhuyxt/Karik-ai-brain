const env = require('./env');

module.exports = {
  apiKey: env.ai.geminiImageApiKey || env.ai.geminiApiKey,
  defaultModel: 'imagen-3.0-generate-002',
  fastModel: 'imagen-3.0-fast-generate-001',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
};
