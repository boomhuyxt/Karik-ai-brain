const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image.controller');

router.get('/catalog', (req, res) => imageController.getCatalog(req, res));
router.get('/templates', (req, res) => imageController.getTemplates(req, res));
router.post('/match-template', (req, res) => imageController.matchTemplate(req, res));
router.get('/profile', (req, res, next) => imageController.getProfile(req, res, next));
router.put('/profile', (req, res, next) => imageController.saveProfile(req, res, next));
router.post('/profile/history', (req, res, next) => imageController.recordHistory(req, res, next));
router.post('/design', (req, res, next) => imageController.createDesign(req, res, next));
router.post('/generate', (req, res, next) => imageController.generateImage(req, res, next));

module.exports = router;
