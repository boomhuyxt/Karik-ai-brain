const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledge.controller');

router.get('/search', (req, res, next) => knowledgeController.search(req, res, next));

module.exports = router;
