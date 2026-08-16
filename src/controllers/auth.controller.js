const authService = require('../services/auth/auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: true, message: err.message });
    }
  }

  async register(req, res, next) {
    try {
      const { email, password, fullName } = req.body;
      const result = await authService.register({ email, password, fullName });
      res.status(201).json(result);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: true, message: err.message });
    }
  }

  async me(req, res, next) {
    try {
      const userId = req.user?.id || 'usr_admin';
      const result = await authService.getProfile(userId);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 404).json({ error: true, message: err.message });
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: true, message: 'Vui lòng nhập Email.' });
      const result = await authService.forgotPassword(email);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: true, message: err.message });
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ error: true, message: 'Vui lòng nhập đầy đủ Email, mã OTP và Mật khẩu mới.' });
      }
      const result = await authService.resetPassword({ email, otp, newPassword });
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: true, message: err.message });
    }
  }
}

module.exports = new AuthController();
