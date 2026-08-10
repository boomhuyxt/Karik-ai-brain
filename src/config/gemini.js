const env = require('./env');

module.exports = {
  apiKey: env.ai.geminiApiKey,
  defaultModel: 'gemini-3.5-flash-lite',
  fastModel: 'gemini-3.5-flash-lite',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
};
