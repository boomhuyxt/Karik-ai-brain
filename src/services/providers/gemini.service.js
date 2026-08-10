const geminiProvider = require('../../providers/gemini/chat');

class GeminiService {
  async chat(prompt, options) {
    return await geminiProvider.chat(prompt, options);
  }
}

module.exports = new GeminiService();
