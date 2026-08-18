const userRepository = require('../../repositories/user.repository');
const { generateToken, hashPassword, comparePassword } = require('../../utils/crypto');

class AuthService {
  async register({ email, password, fullName }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.');
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = hashPassword(password);
    const user = await userRepository.createUser({ email, passwordHash, fullName });
    const token = generateToken(32);

    return {
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: String(user.role || '0')
      },
      token
    };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Email hoặc mật khẩu không chính xác.');
      error.statusCode = 401;
      throw error;
    }

    if (user.status === 'blocked') {
      const error = new Error('Tài khoản của bạn đã bị khóa do vi phạm điều khoản dịch vụ. Vui lòng liên hệ Admin!');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = comparePassword(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Email hoặc mật khẩu không chính xác.');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken(32);

    return {
      success: true,
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.name || 'User',
        role: String(user.role || (user.email.includes('admin') ? '1' : '0'))
      },
      token
    };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error('Không tìm thấy thông tin người dùng.');
      error.statusCode = 404;
      throw error;
    }
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: String(user.role || (user.email.includes('admin') ? '1' : '0'))
      }
    };
  }

  async forgotPassword(email) {
    const mailService = require('../mail.service');
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Email không tồn tại trên hệ thống.');
      error.statusCode = 404;
      throw error;
    }

    // Generate 6-digit random OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes validity

    if (!this.otpStore) this.otpStore = new Map();
    this.otpStore.set(user.email.toLowerCase(), { otpCode, expiresAt });

    // Send email via mail service
    const mailResult = await mailService.sendOtpEmail(user.email, otpCode);

    return {
      success: true,
      message: 'Mã OTP đặt lại mật khẩu đã được gửi tới email của bạn!',
      devOtp: mailResult.devOtp || null
    };
  }

  async resetPassword({ email, otp, newPassword }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Email không tồn tại.');
      error.statusCode = 404;
      throw error;
    }

    const key = user.email.toLowerCase();
    if (!this.otpStore || !this.otpStore.has(key)) {
      const error = new Error('Vui lòng yêu cầu gửi mã OTP trước.');
      error.statusCode = 400;
      throw error;
    }

    const { otpCode, expiresAt } = this.otpStore.get(key);

    if (Date.now() > expiresAt) {
      this.otpStore.delete(key);
      const error = new Error('Mã OTP đã hết hạn (quá 15 phút). Vui lòng gửi lại mã mới.');
      error.statusCode = 400;
      throw error;
    }

    if (otp !== otpCode) {
      const error = new Error('Mã OTP xác nhận không đúng.');
      error.statusCode = 400;
      throw error;
    }

    const newPasswordHash = hashPassword(newPassword);
    await userRepository.updatePassword(key, newPasswordHash);
    this.otpStore.delete(key);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
    };
  }
}

module.exports = new AuthService();
