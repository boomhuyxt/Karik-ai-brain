const { countTokens } = require('../utils/tokenizer');

const requestCounts = new Map();
const tokenCounts = new Map();
const violationsMap = new Map();
const cooldownMap = new Map();

// Periodic cleanup every 5 minutes to prevent memory leaks from inactive IPs
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const maxRetention = 10 * 60 * 1000; // 10 minutes

  for (const [ip, timestamps] of requestCounts.entries()) {
    const valid = timestamps.filter((t) => t > now - maxRetention);
    if (valid.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, valid);
    }
  }

  for (const [ip, tokenEntries] of tokenCounts.entries()) {
    const valid = tokenEntries.filter((e) => e.timestamp > now - maxRetention);
    if (valid.length === 0) {
      tokenCounts.delete(ip);
    } else {
      tokenCounts.set(ip, valid);
    }
  }

  for (const [ip, until] of cooldownMap.entries()) {
    if (now >= until) {
      cooldownMap.delete(ip);
      violationsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Ensure cleanup timer does not keep Node process alive
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Creates an Anti-Spam Rate Limiting middleware
 * @param {Object} options
 * @param {number} [options.windowMs=60000] - Time window in milliseconds (default 1 min)
 * @param {number} [options.max=200] - Max requests in windowMs
 * @param {number} [options.burstMax] - Max burst requests in burstWindowMs
 * @param {number} [options.burstWindowMs=2000] - Burst window in milliseconds
 * @param {number} [options.maxTpm=1000000] - Max tokens per minute
 * @param {number} [options.cooldownMs=300000] - Cooldown period in ms if banned (default 5 min)
 * @param {number} [options.maxViolations=5] - Consecutive violations before cooldown ban
 */
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 60000;
  const max = options.max !== undefined ? options.max : 200;
  const burstMax = options.burstMax || 0;
  const burstWindowMs = options.burstWindowMs || 2000;
  const maxTpm = options.maxTpm !== undefined ? options.maxTpm : 1000000;
  const cooldownMs = options.cooldownMs || 300000;
  const maxViolations = options.maxViolations || 5;

  return (req, res, next) => {
    const ip =
      req.headers?.['cf-connecting-ip'] ||
      (typeof req.headers?.['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : null) ||
      req.ip ||
      'global';

    const now = Date.now();

    // 1. Check if IP is under active Cooldown Ban
    const cooldownUntil = cooldownMap.get(ip);
    if (cooldownUntil && now < cooldownUntil) {
      const retryAfterSec = Math.max(1, Math.ceil((cooldownUntil - now) / 1000));
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfterSec);
      }
      return res.status(429).json({
        error: true,
        code: 'IP_COOLDOWN_ACTIVE',
        message: `Địa chỉ IP của bạn tạm thời bị khóa do gửi quá nhiều yêu cầu bất thường. Vui lòng thử lại sau ${retryAfterSec} giây.`,
        retryAfter: retryAfterSec
      });
    }

    const windowStart = now - windowMs;

    // 2. Check Burst Spike Limit (prevent automated fast spamming)
    let userRequests = requestCounts.get(ip) || [];
    userRequests = userRequests.filter((timestamp) => timestamp > windowStart);

    if (burstMax > 0) {
      const burstStart = now - burstWindowMs;
      const burstRequests = userRequests.filter((t) => t > burstStart);
      if (burstRequests.length >= burstMax) {
        const violations = (violationsMap.get(ip) || 0) + 1;
        violationsMap.set(ip, violations);

        if (violations >= maxViolations) {
          cooldownMap.set(ip, now + cooldownMs);
        }

        if (typeof res.setHeader === 'function') {
          res.setHeader('Retry-After', Math.ceil(burstWindowMs / 1000));
        }

        return res.status(429).json({
          error: true,
          code: 'BURST_LIMIT_EXCEEDED',
          message: 'Yêu cầu quá dồn dập (Burst limit reached). Vui lòng gửi chậm lại.',
          retryAfter: Math.ceil(burstWindowMs / 1000)
        });
      }
    }

    // 3. Check Window Request Limit (RPM)
    if (max && userRequests.length >= max) {
      const violations = (violationsMap.get(ip) || 0) + 1;
      violationsMap.set(ip, violations);

      if (violations >= maxViolations) {
        cooldownMap.set(ip, now + cooldownMs);
      }

      const retryAfterSec = Math.max(1, Math.ceil((userRequests[0] + windowMs - now) / 1000));
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfterSec);
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', 0);
      }

      return res.status(429).json({
        error: true,
        code: 'RPM_LIMIT_EXCEEDED',
        message: 'Too many requests (RPM limit reached), please try again later.',
        retryAfter: retryAfterSec
      });
    }

    // 4. Check Token Limit (TPM)
    let userTokenLogs = tokenCounts.get(ip) || [];
    userTokenLogs = userTokenLogs.filter((entry) => entry.timestamp > windowStart);

    const currentTpm = userTokenLogs.reduce((sum, entry) => sum + entry.tokens, 0);
    const estimatedRequestTokens = countTokens(JSON.stringify(req.body || {}));

    if (maxTpm && (currentTpm + estimatedRequestTokens) > maxTpm) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', Math.max(1, Math.ceil(windowMs / 1000)));
      }
      return res.status(429).json({
        error: true,
        code: 'TPM_LIMIT_EXCEEDED',
        message: `Exceeded TPM limit (${maxTpm} Tokens Per Minute). Please wait a moment before trying again.`
      });
    }

    // Record request and tokens
    userRequests.push(now);
    requestCounts.set(ip, userRequests);

    userTokenLogs.push({ timestamp: now, tokens: estimatedRequestTokens });
    tokenCounts.set(ip, userTokenLogs);

    // Set standard response headers
    if (typeof res.setHeader === 'function' && max) {
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', Math.max(0, max - userRequests.length));
    }

    next();
  };
};

// Specialized Anti-Spam Limiters for different sensitive areas
const apiLimiter = rateLimit({
  windowMs: 60000,
  max: 120,
  burstMax: 20,
  burstWindowMs: 2000
});

const authLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  burstMax: 5,
  burstWindowMs: 5000,
  cooldownMs: 300000,
  maxViolations: 3
});

const heavyAiLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  burstMax: 8,
  burstWindowMs: 4000
});

module.exports = rateLimit;
module.exports.rateLimit = rateLimit;
module.exports.apiLimiter = apiLimiter;
module.exports.authLimiter = authLimiter;
module.exports.heavyAiLimiter = heavyAiLimiter;
module.exports._requestCounts = requestCounts;
module.exports._tokenCounts = tokenCounts;
module.exports._cooldownMap = cooldownMap;
module.exports._violationsMap = violationsMap;

