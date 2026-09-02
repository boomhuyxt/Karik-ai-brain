const test = require('node:test');
const assert = require('node:assert');
const rateLimit = require('../../src/middlewares/rateLimit');

test('Anti-Spam Rate Limiter Suite', async (t) => {
  // Test 1: Normal requests within limit pass through
  const limiter = rateLimit({ windowMs: 10000, max: 5, burstMax: 3, burstWindowMs: 1000 });
  const ip = `test_ip_${Date.now()}`;
  let resCode = null;
  let resJson = null;
  const headers = {};

  const makeRes = () => ({
    status: (code) => {
      resCode = code;
      return {
        json: (data) => {
          resJson = data;
        }
      };
    },
    setHeader: (k, v) => {
      headers[k] = v;
    }
  });

  // Request 1: Should pass
  let calledNext = false;
  limiter({ ip, headers: {} }, makeRes(), () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'First request should pass');
  assert.strictEqual(headers['RateLimit-Limit'], 5);
  assert.strictEqual(headers['RateLimit-Remaining'], 4);

  // Request 2: Should pass
  calledNext = false;
  limiter({ ip, headers: {} }, makeRes(), () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'Second request should pass');

  // Request 3: Should pass
  calledNext = false;
  limiter({ ip, headers: {} }, makeRes(), () => { calledNext = true; });
  assert.strictEqual(calledNext, true, 'Third request should pass');

  // Request 4 (Burst Spike: 4 requests within 1000ms, burstMax is 3): Should trigger burst protection
  calledNext = false;
  limiter({ ip, headers: {} }, makeRes(), () => { calledNext = true; });
  assert.strictEqual(calledNext, false, 'Burst spike request should be blocked');
  assert.strictEqual(resCode, 429, 'Status should be 429');
  assert.strictEqual(resJson.code, 'BURST_LIMIT_EXCEEDED');
  assert.ok(resJson.message.includes('Burst limit reached'));

  // Test 2: Standard RPM limit
  const rpmLimiter = rateLimit({ windowMs: 5000, max: 2, burstMax: 0 });
  const ipRpm = `test_ip_rpm_${Date.now()}`;

  let pass1 = false;
  let pass2 = false;
  let pass3 = false;

  rpmLimiter({ ip: ipRpm, headers: {} }, makeRes(), () => { pass1 = true; });
  rpmLimiter({ ip: ipRpm, headers: {} }, makeRes(), () => { pass2 = true; });
  rpmLimiter({ ip: ipRpm, headers: {} }, makeRes(), () => { pass3 = true; });

  assert.strictEqual(pass1, true, 'First request under max should pass');
  assert.strictEqual(pass2, true, 'Second request under max should pass');
  assert.strictEqual(pass3, false, 'Third request exceeding max should be blocked with 429');
  assert.strictEqual(resCode, 429);
  assert.strictEqual(resJson.code, 'RPM_LIMIT_EXCEEDED');

  // Test 3: Cooldown ban for repeated violations
  const strictLimiter = rateLimit({
    windowMs: 5000,
    max: 1,
    burstMax: 0,
    maxViolations: 2,
    cooldownMs: 60000
  });
  const ipBan = `test_ip_ban_${Date.now()}`;

  // 1st request -> ok
  let okReq = false;
  strictLimiter({ ip: ipBan, headers: {} }, makeRes(), () => { okReq = true; });
  assert.strictEqual(okReq, true);

  // 1st violation -> 429 RPM
  strictLimiter({ ip: ipBan, headers: {} }, makeRes(), () => {});
  assert.strictEqual(resJson.code, 'RPM_LIMIT_EXCEEDED');

  // 2nd violation -> triggers cooldown
  strictLimiter({ ip: ipBan, headers: {} }, makeRes(), () => {});
  assert.strictEqual(resJson.code, 'RPM_LIMIT_EXCEEDED');

  // Subsequent request -> active cooldown ban
  strictLimiter({ ip: ipBan, headers: {} }, makeRes(), () => {});
  assert.strictEqual(resJson.code, 'IP_COOLDOWN_ACTIVE');
  assert.strictEqual(resJson.error, true);
  assert.ok(resJson.message.includes('tạm thời bị khóa'));

  console.log('✅ Anti-Spam Rate Limiter & Cooldown Suite passed successfully!');
});
