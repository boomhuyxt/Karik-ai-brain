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

  async updateUserRole(req, res, next) {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      const { id } = req.params;
      const { role } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: 'Thiếu thông tin người dùng.' });
      }

      if (role === undefined || role === null || !['0', '1', '2', 'admin', 'user', 'post_office', 'buu_cuc'].includes(String(role).toLowerCase())) {
        return res.status(400).json({ success: false, error: 'Vai trò (role) không hợp lệ. Giá trị hợp lệ: "0" (User / Chủ Shop), "1" (Admin), "2" (Bưu Cục Đơn Hàng).' });
      }

      const roleStr = String(role).toLowerCase();
      let targetRole = '0';
      if (roleStr === '1' || roleStr === 'admin') targetRole = '1';
      else if (roleStr === '2' || roleStr === 'post_office' || roleStr === 'buu_cuc') targetRole = '2';

      const targetUser = await userRepository.findById(id);

      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
      }

      const targetEmail = (targetUser.email || '').toLowerCase();
      const isRootAdmin = targetUser.id === 'usr_admin' || targetUser.id === 'usr_adminAI' || targetEmail === 'adminai' || targetEmail === 'admin@ai-brain.local';

      // Protection: Protect Root Admin from demotion
      if (isRootAdmin && targetRole !== '1') {
        return res.status(400).json({ success: false, error: 'Không thể hạ quyền tài khoản Quản trị viên hệ thống (Root Admin).' });
      }

      // Protection: Self-demotion check
      if (req.user?.id === id && targetRole !== '1') {
        return res.status(400).json({ success: false, error: 'Bạn không thể tự hạ quyền Admin của chính mình.' });
      }

      await userRepository.updateUserRole(id, targetRole);

      let roleLabel = 'Chủ Shop (User)';
      if (targetRole === '1') roleLabel = 'Quản trị viên (Admin)';
      else if (targetRole === '2') roleLabel = 'Bưu Cục Đơn Hàng';

      return res.json({
        success: true,
        message: `Đã cập nhật vai trò người dùng thành "${roleLabel}" thành công!`,
        role: targetRole
      });
    } catch (err) {
      next(err);
    }
  }

  // Alias method for updateUserRole
  async changeUserRole(req, res, next) {
    return this.updateUserRole(req, res, next);
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
