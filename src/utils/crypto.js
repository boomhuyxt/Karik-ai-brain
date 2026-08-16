const crypto = require('crypto');

const hashText = (text = '') => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
};

const comparePassword = (password, storedHash) => {
  if (!storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return hashText(password) === storedHash;
  const [salt, originalHash] = parts;
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return hash === originalHash;
};

module.exports = {
  hashText,
  generateToken,
  hashPassword,
  comparePassword
};
