const groqProvider = require('../../providers/groq/chat');

class GroqService {
  async chat(prompt, options) {
    return await groqProvider.chat(prompt, options);
  }
}

module.exports = new GroqService();
