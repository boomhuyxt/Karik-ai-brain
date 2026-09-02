const userRepository = require('../repositories/user.repository');
const { verifySignedToken } = require('../utils/crypto');

/**
 * Extracts and verifies the token, populating req.user if valid.
 * Does not block if token is missing/invalid (soft auth), but ensures req.user is verified.
 */
const parseUserToken = async (req) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return null;
  }

  // 1. Verify cryptographic HMAC signature & expiration
  const payload = verifySignedToken(token);
  if (!payload || !payload.id) {
    return null;
  }

  // 2. Fetch fresh user data from database/repository to check current status and role
  try {
    let user = await userRepository.findById(payload.id);
    if (!user && payload.email) {
      user = await userRepository.findByEmail(payload.email);
    }

    if (user) {
      if (user.status === 'blocked') {
        const error = new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!');
        error.statusCode = 403;
        error.code = 'ACCOUNT_BLOCKED';
        throw error;
      }

      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName || user.name || payload.fullName || 'User',
        role: String(user.role !== undefined ? user.role : (payload.role || '0')),
        status: user.status || 'active',
        token
      };
    }

    // Fallback to payload if valid signed token
    return {
      id: payload.id,
      email: payload.email || '',
      fullName: payload.fullName || 'User',
      role: String(payload.role || '0'),
      status: 'active',
      token
    };
  } catch (err) {
    if (err.statusCode === 403) throw err;
    console.warn('[AuthMiddleware] Error fetching user for token:', err.message);
    return null;
  }
};

/**
 * Soft Auth Middleware: Attaches verified user to req.user if token is provided.
 */
const authMiddleware = async (req, res, next) => {
  try {
    req.user = await parseUserToken(req);
    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      error: true,
      code: err.code || 'UNAUTHORIZED',
      message: err.message
    });
  }
};

/**
 * Helper to check whether a user object has Admin privileges
 */
const isUserAdmin = (user) => {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const email = String(user.email || '').toLowerCase();
  return role === '1' || role === 'admin' || email === 'adminai' || email === 'admin@ai-brain.local';
};

/**
 * Strict Admin Guard Middleware: Requires valid authentication AND Admin role.
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      req.user = await parseUserToken(req);
    }

    if (!req.user) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để tiếp tục.'
      });
    }

    if (!isUserAdmin(req.user)) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'Quyền truy cập bị từ chối. Chỉ tài khoản Quản trị viên (Admin) mới có quyền sử dụng API.'
      });
    }

    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      error: true,
      code: err.code || 'UNAUTHORIZED',
      message: err.message
    });
  }
};

/**
 * Whitelisted public routes that do not require Admin authentication
 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password'
];

/**
 * Overarching API Guard:
 * Intercepts all /api routes.
 * - Allows public auth endpoints through without check.
 * - For all other endpoints: Requires authenticated user with Admin role.
 */
const adminApiGuard = async (req, res, next) => {
  const reqPath = (req.path || '').toLowerCase();

  const isPublicAuthRoute = PUBLIC_AUTH_PATHS.some((p) => reqPath === p || reqPath.endsWith(p));
  if (isPublicAuthRoute) {
    return next();
  }

  try {
    req.user = await parseUserToken(req);

    if (!req.user) {
      return res.status(401).json({
        error: true,
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập với quyền Admin để sử dụng API.'
      });
    }

    if (!isUserAdmin(req.user)) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'Quyền truy cập bị từ chối. Chỉ tài khoản Quản trị viên (Admin) mới có quyền sử dụng API.'
      });
    }

    next();
  } catch (err) {
    return res.status(err.statusCode || 401).json({
      error: true,
      code: err.code || 'UNAUTHORIZED',
      message: err.message
    });
  }
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.adminApiGuard = adminApiGuard;
module.exports.isUserAdmin = isUserAdmin;
module.exports.parseUserToken = parseUserToken;

