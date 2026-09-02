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

const TOKEN_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.APP_SECRET || 'karik-ai-brain-secure-token-secret-2026';

const base64UrlEncode = (str) => {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
};

const createSignedToken = (payload = {}, expiresInMs = 7 * 24 * 60 * 60 * 1000) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Date.now();
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInMs
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');

  return `${data}.${signature}`;
};

const verifySignedToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');

  if (signature.length !== expectedSignature.length) return null;
  const isMatch = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!isMatch) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
};

module.exports = {
  hashText,
  generateToken,
  hashPassword,
  comparePassword,
  createSignedToken,
  verifySignedToken
};

