const validateProject = (req, res, next) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: true, message: 'Project name is required.' });
  }
  next();
};

module.exports = {
  validateProject
};
