const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validations/auth.validation');
const { authLimiter } = require('../middlewares/rateLimit');

router.post('/login', authLimiter, validateLogin, (req, res, next) => authController.login(req, res, next));
router.post('/register', authLimiter, validateRegister, (req, res, next) => authController.register(req, res, next));
router.get('/me', (req, res, next) => authController.me(req, res, next));
router.post('/forgot-password', authLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', authLimiter, (req, res, next) => authController.resetPassword(req, res, next));

module.exports = router;



