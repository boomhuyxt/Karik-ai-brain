const express = require('express');
const router = express.Router();
const wikiController = require('../controllers/wiki.controller');

router.get('/', (req, res, next) => wikiController.getNotes(req, res, next));
router.get('/:id', (req, res, next) => wikiController.getNoteById(req, res, next));

module.exports = router;
