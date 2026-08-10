const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflow.controller');

router.get('/', (req, res, next) => workflowController.getWorkflows(req, res, next));

module.exports = router;
