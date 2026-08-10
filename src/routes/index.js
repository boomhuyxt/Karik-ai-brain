const express = require('express');
const router = express.Router();

const authRoute = require('./auth.route');
const chatRoute = require('./chat.route');
const wikiRoute = require('./wiki.route');
const memoryRoute = require('./memory.route');
const projectRoute = require('./project.route');
const dashboardRoute = require('./dashboard.route');
const knowledgeRoute = require('./knowledge.route');
const workflowRoute = require('./workflow.route');
const githubRoute = require('./github.route');

// Service dependencies for legacy / standalone graph dashboard endpoints
const graphService = require('../services/obsidian/graph.service');
const progressService = require('../services/ai/progress.service');
const tokenService = require('../services/ai/token.service');

// Module Routes
router.use('/auth', authRoute);
router.use('/chat', chatRoute);
router.use('/wiki', wikiRoute);
router.use('/memory', memoryRoute);
router.use('/project', projectRoute);
router.use('/dashboard', dashboardRoute);
router.use('/knowledge', knowledgeRoute);
router.use('/workflow', workflowRoute);
router.use('/github', githubRoute);

// Backwards-compatible / Helper API endpoints
router.get('/nodes', async (req, res, next) => {
  try {
    const data = await graphService.getGraphData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/tasks', (req, res) => {
  res.json(progressService.getTasks());
});

router.get('/tokens', async (req, res, next) => {
  try {
    const summary = await tokenService.getUsageSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/risk', (req, res) => {
  res.json({
    riskPercentage: 12,
    level: 'Low',
    statusText: 'Hệ thống an toàn. Không có mối đe dọa.'
  });
});

module.exports = router;
