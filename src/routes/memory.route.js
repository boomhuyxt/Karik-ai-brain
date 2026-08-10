const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memory.controller');

router.get('/', (req, res, next) => memoryController.getMemories(req, res, next));
router.post('/', (req, res, next) => memoryController.saveMemory(req, res, next));

module.exports = router;
