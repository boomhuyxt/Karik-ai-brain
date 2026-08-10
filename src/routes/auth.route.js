const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin } = require('../validations/auth.validation');

router.post('/login', validateLogin, (req, res, next) => authController.login(req, res, next));

module.exports = router;
