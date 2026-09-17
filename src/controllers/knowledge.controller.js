const searchService = require('../services/knowledge/search.service');
const knowledgePipelineService = require('../services/knowledge/knowledgePipeline.service');

class KnowledgeController {
  async search(req, res, next) {
    try {
      const { q, limit } = req.query;
      const results = await searchService.vectorSearch(q || '', limit ? Number(limit) : 5);
      res.json({ success: true, count: results.length, data: results });
    } catch (err) {
      next(err);
    }
  }

  async getRecent(req, res, next) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const recent = knowledgePipelineService.getRecentLearnedNotes(limit);
      res.json({ success: true, count: recent.length, data: recent });
    } catch (err) {
      next(err);
    }
  }

  async digestManual(req, res, next) {
    try {
      const { prompt, reply, topic } = req.body;
      if (!prompt || !reply) {
        return res.status(400).json({ success: false, error: 'Vui lòng cung cấp prompt và reply để đóng gói tri thức.' });
      }

      const targetTopic = topic || knowledgePipelineService.extractTopic(prompt, reply);
      const result = await knowledgePipelineService.distillToAtomicNotes(targetTopic, prompt, reply);
      res.json({ success: true, message: 'Đã phân rã và lưu sơ đồ tri thức vào Obsidian thành công!', ...result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new KnowledgeController();
