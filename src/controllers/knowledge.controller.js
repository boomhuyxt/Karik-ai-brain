const searchService = require('../services/knowledge/search.service');

class KnowledgeController {
  async search(req, res, next) {
    try {
      const { q } = req.query;
      const results = await searchService.vectorSearch(q || '');
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new KnowledgeController();
