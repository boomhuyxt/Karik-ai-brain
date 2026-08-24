const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const roleHeader = req.headers['x-user-role'];
  const emailHeader = req.headers['x-user-email'];
  const userIdHeader = req.headers['x-user-id'];

  const token = authHeader ? authHeader.split(' ')[1] : null;

  req.user = {
    id: userIdHeader || 'usr_admin',
    token,
    role: roleHeader || (emailHeader && emailHeader.includes('admin') ? '1' : '0'),
    email: emailHeader || 'adminai'
  };
  next();
};

module.exports = authMiddleware;
