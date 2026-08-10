const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { validateProject } = require('../validations/project.validation');

router.get('/', (req, res, next) => projectController.getProjects(req, res, next));
router.put('/', validateProject, (req, res, next) => projectController.saveProject(req, res, next));

module.exports = router;
