const userRepository = require('../repositories/user.repository');

class AdminController {
  async getAllUsers(req, res, next) {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const data = await userRepository.findAllUsers();
      return res.json({
        success: true,
        stats: data.stats,
        users: data.users
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleUserStatus(req, res, next) {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      const { id } = req.params;
      const { status } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin người dùng.' });
      }

      await userRepository.updateUserStatus(id, status);

      return res.json({
        success: true,
        message: status === 'blocked' ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản thành công!'
      });
    } catch (err) {
      next(err);
    }
  }

  async changeUserRole(req, res, next) {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      const { id } = req.params;
      const { role } = req.body;

      if (!id || role === undefined) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin người dùng hoặc vai trò.' });
      }

      await userRepository.updateUserRole(id, role);

      const isTargetAdmin = String(role) === '1' || role === 'admin';
      return res.json({
        success: true,
        message: isTargetAdmin ? 'Đã cấp quyền Quản trị viên (Admin) thành công!' : 'Đã chuyển thành Người dùng thông thường (User) thành công!'
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin ID người dùng.' });
      }

      await userRepository.deleteUser(id);

      return res.json({
        success: true,
        message: 'Đã xóa tài khoản người dùng thành công!'
      });
    } catch (err) {
      next(err);
    }
  }

  async cleanTestUsers(req, res, next) {
    try {
      const count = await userRepository.cleanTestUsers();
      return res.json({
        success: true,
        message: `Đã dọn dẹp ${count} tài khoản test thành công!`
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
