const validateChatMessage = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: true, message: 'Message content is required.' });
  }
  next();
};

module.exports = {
  validateChatMessage
};
