const githubRepository = require('../repositories/github.repository');
const dailyService = require('../services/obsidian/daily.service');
const graphService = require('../services/obsidian/graph.service');

class GithubController {
  async getTree(req, res, next) {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const tree = await githubRepository.getTree(forceRefresh);
      res.json({ success: true, tree });
    } catch (err) {
      next(err);
    }
  }

  async getGraph(req, res, next) {
    try {
      const forceRefresh = req.query.refresh === 'true';
      const graph = await graphService.getGraphData(forceRefresh);
      res.json({ success: true, ...graph });
    } catch (err) {
      next(err);
    }
  }

  async getFile(req, res, next) {
    try {
      const filePath = req.query.path || req.params[0] || req.params.path;
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }
      const file = await githubRepository.getFile(filePath);
      res.json({ success: true, file });
    } catch (err) {
      next(err);
    }
  }

  async saveFile(req, res, next) {
    try {
      const { path: filePath, content, sha, message } = req.body;
      if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'File path and content are required' });
      }
      const result = await githubRepository.updateFile(filePath, content, message || `Update ${filePath} via AI Brain OS`, sha);
      res.json({ success: true, file: result });
    } catch (err) {
      next(err);
    }
  }

  async getDaily(req, res, next) {
    try {
      const daily = await dailyService.getTodayDailyNote();
      res.json({ success: true, daily });
    } catch (err) {
      next(err);
    }
  }

  async saveDaily(req, res, next) {
    try {
      const { path: filePath, content, sha } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Daily content is required' });
      }
      const result = await dailyService.saveDailyNote(filePath, content, sha);
      res.json({ success: true, file: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GithubController();
