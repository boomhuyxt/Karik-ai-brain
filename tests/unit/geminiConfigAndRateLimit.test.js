const assert = require('assert');
const geminiConfig = require('../../src/config/gemini');
const rateLimit = require('../../src/middlewares/rateLimit');

// Test 1: Verify Gemini Config Model
assert.strictEqual(geminiConfig.defaultModel, 'gemini-3.5-flash-lite', 'Default model should be gemini-3.5-flash-lite');
assert.strictEqual(geminiConfig.fastModel, 'gemini-3.5-flash-lite', 'Fast model should be gemini-3.5-flash-lite');
console.log('✅ Gemini Config Test Passed: Model set to gemini-3.5-flash-lite');

// Test 2: Verify Rate Limit TPM Middleware
const middleware = rateLimit({ windowMs: 60000, max: 200, maxTpm: 20 });

let resStatus = null;
let resJson = null;
const req = { ip: '127.0.0.1', body: { prompt: 'A very long prompt string testing TPM limits' } };
const res = {
  status: (code) => {
    resStatus = code;
    return {
      json: (data) => {
        resJson = data;
      }
    };
  }
};

let nextCalled = false;
middleware(req, res, () => { nextCalled = true; });
assert.strictEqual(nextCalled, true, 'First request within TPM should pass');

// Second request exceeding TPM limit (50 tokens)
nextCalled = false;
middleware(req, res, () => { nextCalled = true; });
assert.strictEqual(resStatus, 429, 'Request exceeding TPM limit should return HTTP 429');
assert.strictEqual(resJson.error, true, 'Response should contain error flag');
console.log('✅ Rate Limit TPM Test Passed: TPM limit enforced successfully');
