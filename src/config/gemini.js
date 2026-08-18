const env = require('./env');

module.exports = {
  apiKey: env.ai.geminiApiKey,
  defaultModel: 'gemini-3.5-flash-lite',
  fastModel: 'gemini-3.5-flash-lite',
  fallbackModels: ['gemini-flash-lite-latest', 'gemini-3.6-flash'],
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
};

