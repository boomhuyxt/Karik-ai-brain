const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

router.post('/', (req, res, next) => uploadController.uploadFile(req, res, next));

module.exports = router;
