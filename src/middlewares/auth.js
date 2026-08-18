const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const roleHeader = req.headers['x-user-role'];
  const emailHeader = req.headers['x-user-email'];

  if (!authHeader && !roleHeader) {
    req.user = { id: 'anonymous', role: 'guest' };
    return next();
  }

  const token = authHeader ? authHeader.split(' ')[1] : null;
  req.user = {
    id: 'usr_admin',
    token,
    role: roleHeader || '1',
    email: emailHeader || 'adminai'
  };
  next();
};

module.exports = authMiddleware;
