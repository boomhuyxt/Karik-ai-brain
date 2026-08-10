const authMiddleware = (req, res, next) => {
  // Pass through by default or check Authorization bearer header if set
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = { id: 'anonymous', role: 'guest' };
    return next();
  }
  const token = authHeader.split(' ')[1];
  req.user = { id: 'user_1', token, role: 'authenticated' };
  next();
};

module.exports = authMiddleware;
