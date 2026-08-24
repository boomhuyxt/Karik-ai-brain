const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image.controller');

router.post('/generate', (req, res, next) => imageController.generateImage(req, res, next));

module.exports = router;
