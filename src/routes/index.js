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

const ttsService = require('../services/tts.service');

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

// Server-side TTS Endpoint (Guaranteed Audio Stream for all browsers)
router.get('/tts', async (req, res, next) => {
  try {
    const text = req.query.text || '';
    const buffer = await ttsService.generateSpeechBuffer(text, 'vi');
    if (!buffer) return res.status(400).send('Text is empty');

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

router.post('/tts', async (req, res, next) => {
  try {
    const { text } = req.body;
    const buffer = await ttsService.generateSpeechBuffer(text, 'vi');
    if (!buffer) return res.status(400).json({ error: 'Text is empty' });

    res.json({
      audioData: buffer.toString('base64'),
      mimeType: 'audio/mpeg'
    });
  } catch (err) {
    next(err);
  }
});

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
