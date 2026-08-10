const claudeProvider = require('../../providers/claude/chat');

class ClaudeService {
  async chat(prompt, options) {
    return await claudeProvider.chat(prompt, options);
  }
}

module.exports = new ClaudeService();
