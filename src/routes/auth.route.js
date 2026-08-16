const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validations/auth.validation');

router.post('/login', validateLogin, (req, res, next) => authController.login(req, res, next));
router.post('/register', validateRegister, (req, res, next) => authController.register(req, res, next));
router.get('/me', (req, res, next) => authController.me(req, res, next));
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

module.exports = router;
