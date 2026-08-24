const tokenrouterProvider = require('../../providers/tokenrouter/chat');

class TokenRouterService {
  async chat(prompt, options) {
    return await tokenrouterProvider.chat(prompt, options);
  }
}

module.exports = new TokenRouterService();
