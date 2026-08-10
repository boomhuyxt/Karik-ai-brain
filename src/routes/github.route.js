const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github.controller');

router.get('/tree', (req, res, next) => githubController.getTree(req, res, next));
router.get('/file', (req, res, next) => githubController.getFile(req, res, next));
router.post('/file', (req, res, next) => githubController.saveFile(req, res, next));
router.get('/daily', (req, res, next) => githubController.getDaily(req, res, next));
router.post('/daily', (req, res, next) => githubController.saveDaily(req, res, next));

module.exports = router;
