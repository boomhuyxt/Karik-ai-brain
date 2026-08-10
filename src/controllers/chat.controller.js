const aiManagerService = require('../services/ai/aiManager.service');

class ChatController {
  async handleChat(req, res, next) {
    try {
      const { message, category, tts, voice, model } = req.body;
      const options = { tts, voice, model };
      const response = await aiManagerService.processRequest(message, category, options);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
