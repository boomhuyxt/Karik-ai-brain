const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Admin Permission Middleware
const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || '');
  const email = (req.user?.email || '').toLowerCase();
  const isAdmin = role === '1' || role === 'admin' || email.includes('admin');

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên (Admin).'
    });
  }
  next();
};

router.use(requireAdmin);

router.get('/users', (req, res, next) => adminController.getAllUsers(req, res, next));
router.delete('/users/test-users', (req, res, next) => adminController.cleanTestUsers(req, res, next));
router.patch('/users/:id/role', (req, res, next) => adminController.changeUserRole(req, res, next));
router.patch('/users/:id/status', (req, res, next) => adminController.toggleUserStatus(req, res, next));
router.delete('/users/:id', (req, res, next) => adminController.deleteUser(req, res, next));

module.exports = router;
