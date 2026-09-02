const test = require('node:test');
const assert = require('node:assert');
const { verifyTurnstile, verifyTurnstileToken } = require('../../src/middlewares/turnstile');
const config = require('../../src/config/env');

test('Cloudflare Turnstile Middleware & Token Verification', async (t) => {
  await t.test('verifyTurnstileToken - Cloudflare Official Always-Pass Test Key', async () => {
    // Cloudflare dummy test keys
    const dummyPassToken = '1x00000000000000000000AA';
    const result = await verifyTurnstileToken(dummyPassToken, '127.0.0.1');

    // Should return success: true when tested against Cloudflare siteverify endpoint
    assert.strictEqual(result.success, true);
    assert.ok(result.raw);
  });

  await t.test('verifyTurnstileToken - Cloudflare Official Always-Fail Test Key', async () => {
    const originalSecret = config.cloudflare.turnstileSecretKey;
    config.cloudflare.turnstileSecretKey = '2x0000000000000000000000000000000AA';

    const dummyFailToken = '2x00000000000000000000AB';
    const result = await verifyTurnstileToken(dummyFailToken, '127.0.0.1');

    // Cloudflare always-fail token returns success: false
    assert.strictEqual(result.success, false);
    assert.ok(Array.isArray(result.errorCodes));

    config.cloudflare.turnstileSecretKey = originalSecret;
  });

  await t.test('verifyTurnstile - Bypassed when turnstileEnabled is false', async () => {
    const originalEnabled = config.cloudflare.turnstileEnabled;
    config.cloudflare.turnstileEnabled = false;

    let nextCalled = false;
    const req = { body: {} };
    const res = {};
    const next = () => {
      nextCalled = true;
    };

    await verifyTurnstile(req, res, next);
    assert.strictEqual(nextCalled, true);

    config.cloudflare.turnstileEnabled = originalEnabled;
  });

  await t.test('verifyTurnstile - Rejects when token is missing and enabled is true', async () => {
    const originalEnabled = config.cloudflare.turnstileEnabled;
    config.cloudflare.turnstileEnabled = true;

    let statusCode = null;
    let jsonResponse = null;

    const req = {
      body: {},
      headers: {}
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      }
    };
    const next = () => {};

    await verifyTurnstile(req, res, next);

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonResponse.error, true);
    assert.ok(jsonResponse.message.includes('Turnstile'));

    config.cloudflare.turnstileEnabled = originalEnabled;
  });

  await t.test('verifyTurnstile - Accepts valid token from body or header', async () => {
    const originalEnabled = config.cloudflare.turnstileEnabled;
    config.cloudflare.turnstileEnabled = true;

    let nextCalled = false;
    const req = {
      body: {
        'cf-turnstile-response': '1x00000000000000000000AA'
      },
      headers: {},
      ip: '127.0.0.1'
    };
    const res = {
      status() {
        return this;
      },
      json() {
        return this;
      }
    };
    const next = () => {
      nextCalled = true;
    };

    await verifyTurnstile(req, res, next);

    assert.strictEqual(nextCalled, true);
    assert.ok(req.turnstile);
    assert.strictEqual(req.turnstile.success, true);

    config.cloudflare.turnstileEnabled = originalEnabled;
  });
});
