const openaiProvider = require('../../providers/openai/chat');

class OpenAIService {
  async chat(prompt, options) {
    return await openaiProvider.chat(prompt, options);
  }
}

module.exports = new OpenAIService();
