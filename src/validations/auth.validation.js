const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, message: 'Email và mật khẩu không được để trống.' });
  }
  next();
};

const validateRegister = (req, res, next) => {
  const { email, password, confirmPassword, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: true, message: 'Vui lòng điền đầy đủ các trường bắt buộc.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: true, message: 'Định dạng email không hợp lệ.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: true, message: 'Mật khẩu phải chứa ít nhất 6 ký tự.' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: true, message: 'Mật khẩu xác nhận không trùng khớp.' });
  }

  next();
};

module.exports = {
  validateLogin,
  validateRegister
};
