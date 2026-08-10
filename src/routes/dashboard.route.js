const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/', (req, res, next) => dashboardController.getDashboard(req, res, next));

module.exports = router;
