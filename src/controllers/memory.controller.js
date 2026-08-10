const memoryService = require('../services/knowledge/memory.service');

class MemoryController {
  async getMemories(req, res, next) {
    try {
      const memories = await memoryService.getUserMemories(req.user?.id || 'anonymous');
      res.json(memories);
    } catch (err) {
      next(err);
    }
  }

  async saveMemory(req, res, next) {
    try {
      const { key, value } = req.body;
      const result = await memoryService.saveUserMemory(req.user?.id || 'anonymous', key, value);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MemoryController();
