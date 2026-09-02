const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validations/auth.validation');
const { verifyTurnstile } = require('../middlewares/turnstile');
const config = require('../config/env');

// Public config for frontend turnstile initialization
router.get('/turnstile-config', (req, res) => {
  res.json({
    enabled: !!config.cloudflare.turnstileEnabled,
    siteKey: config.cloudflare.turnstileSiteKey || '1x00000000000000000000AA'
  });
});

router.post('/login', verifyTurnstile, validateLogin, (req, res, next) => authController.login(req, res, next));
router.post('/register', verifyTurnstile, validateRegister, (req, res, next) => authController.register(req, res, next));
router.get('/me', (req, res, next) => authController.me(req, res, next));
router.post('/forgot-password', verifyTurnstile, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

module.exports = router;

