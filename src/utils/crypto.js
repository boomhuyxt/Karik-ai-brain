const crypto = require('crypto');

const hashText = (text = '') => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  hashText,
  generateToken
};
