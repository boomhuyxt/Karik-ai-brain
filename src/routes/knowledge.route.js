const express = require('express');
const router = express.Router();
const knowledgeController = require('../controllers/knowledge.controller');

// Tra cứu tri thức Vector RAG
router.get('/search', (req, res, next) => knowledgeController.search(req, res, next));

// Xem danh sách các cụm tri thức Obsidian vừa được AI học
router.get('/recent', (req, res, next) => knowledgeController.getRecent(req, res, next));

// Đóng gói tri thức thủ công thành Atomic Notes Obsidian
router.post('/digest', (req, res, next) => knowledgeController.digestManual(req, res, next));

module.exports = router;
