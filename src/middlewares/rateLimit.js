const { countTokens } = require('../utils/tokenizer');

const requestCounts = new Map();
const tokenCounts = new Map();

const rateLimit = (options = { windowMs: 60000, max: 200, maxTpm: 1000000 }) => {
  return (req, res, next) => {
    const ip = req.ip || 'global';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // 1. Check Request Limit (RPM)
    let userRequests = requestCounts.get(ip) || [];
    userRequests = userRequests.filter((timestamp) => timestamp > windowStart);

    if (options.max && userRequests.length >= options.max) {
      return res.status(429).json({
        error: true,
        message: 'Too many requests (RPM limit reached), please try again later.'
      });
    }

    // 2. Check Token Limit (TPM)
    let userTokenLogs = tokenCounts.get(ip) || [];
    userTokenLogs = userTokenLogs.filter((entry) => entry.timestamp > windowStart);

    const currentTpm = userTokenLogs.reduce((sum, entry) => sum + entry.tokens, 0);
    const estimatedRequestTokens = countTokens(JSON.stringify(req.body || {}));

    if (options.maxTpm && (currentTpm + estimatedRequestTokens) > options.maxTpm) {
      return res.status(429).json({
        error: true,
        message: `Exceeded TPM limit (${options.maxTpm} Tokens Per Minute). Please wait a moment before trying again.`
      });
    }

    userRequests.push(now);
    requestCounts.set(ip, userRequests);

    userTokenLogs.push({ timestamp: now, tokens: estimatedRequestTokens });
    tokenCounts.set(ip, userTokenLogs);

    next();
  };
};

module.exports = rateLimit;
