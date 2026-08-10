const openrouterProvider = require('../../providers/openrouter/chat');

class OpenRouterService {
  async chat(prompt, options) {
    return await openrouterProvider.chat(prompt, options);
  }
}

module.exports = new OpenRouterService();
