const config = require('../config/env');

/**
 * Verify Cloudflare Turnstile Token
 * @param {string} token - The cf-turnstile-response token from client
 * @param {string} remoteIp - Client IP address
 * @returns {Promise<{success: boolean, errorCodes?: string[], raw?: any}>}
 */
async function verifyTurnstileToken(token, remoteIp = '') {
  const secretKey = config.cloudflare.turnstileSecretKey;
  if (!secretKey) {
    console.warn('[Turnstile] CLOUDFLARE_TURNSTILE_SECRET_KEY is missing. Verification skipped.');
    return { success: true, skipped: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    return {
      success: !!data.success,
      errorCodes: data['error-codes'] || [],
      raw: data
    };
  } catch (error) {
    console.error('[Turnstile] Error verifying token with Cloudflare API:', error.message);
    return { success: false, errorCodes: ['internal-network-error'] };
  }
}

/**
 * Express Middleware to protect endpoints against bot spam / abuse using Turnstile
 */
const verifyTurnstile = async (req, res, next) => {
  // If Turnstile is disabled in config, bypass check
  if (!config.cloudflare.turnstileEnabled) {
    return next();
  }

  // Extract Turnstile response token from body or headers
  const token =
    (req.body && (req.body['cf-turnstile-response'] || req.body.turnstileToken)) ||
    req.headers['x-turnstile-token'];

  if (!token) {
    return res.status(400).json({
      error: true,
      message: 'Thiếu mã xác thực an ninh Cloudflare Turnstile. Vui lòng xác thực trước khi gửi.'
    });
  }

  // Extract Client IP (support Cloudflare reverse proxy header)
  const clientIp =
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) ||
    req.ip ||
    '';

  const verification = await verifyTurnstileToken(token, clientIp);

  if (!verification.success) {
    return res.status(403).json({
      error: true,
      message: 'Xác thực Turnstile không thành công hoặc phiên làm việc đã hết hạn. Vui lòng thử lại.',
      errorCodes: verification.errorCodes
    });
  }

  // Attach Turnstile verification metadata to request object
  req.turnstile = verification.raw;
  next();
};

module.exports = {
  verifyTurnstile,
  verifyTurnstileToken
};
