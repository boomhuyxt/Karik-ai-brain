const validateWikiNote = (req, res, next) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: true, message: 'Wiki note title is required.' });
  }
  next();
};

module.exports = {
  validateWikiNote
};
