const aiManagerService = require('../services/ai/aiManager.service');

class ChatController {
  async handleChat(req, res, next) {
    try {
      const { message, category, tts, voice, model, provider, shop_id } = req.body;
      const shopId = shop_id || req.headers['x-shop-id'] || req.headers['x-user-email'] || req.user?.email || 'default_shop';
      const options = { tts, voice, model, provider: provider || 'gemini', shop_id: shopId, user: req.user };
      const response = await aiManagerService.processRequest(message, category, options);
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
