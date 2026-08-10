const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { validateChatMessage } = require('../validations/chat.validation');

router.post('/', validateChatMessage, (req, res, next) => chatController.handleChat(req, res, next));

module.exports = router;
