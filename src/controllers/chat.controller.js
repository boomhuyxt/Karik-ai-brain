const aiManagerService = require('../services/ai/aiManager.service');

class ChatController {
  async handleChat(req, res, next) {
    try {
      const { message, category, tts, voice, model, provider } = req.body;
      const options = { tts, voice, model, provider: provider || 'gemini' };
      const response = await aiManagerService.processRequest(message, category, options);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
