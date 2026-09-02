const test = require('node:test');
const assert = require('node:assert');
const { createSignedToken, verifySignedToken } = require('../../src/utils/crypto');
const { adminApiGuard, requireAdmin, isUserAdmin } = require('../../src/middlewares/auth');
const userRepository = require('../../src/repositories/user.repository');

test('Admin API Guard & HMAC Signed Token Suite', async (t) => {
  // Test 1: Signed Token Generation & Verification
  const payload = { id: 'usr_test123', email: 'test@example.com', role: '0' };
  const token = createSignedToken(payload, 3600000);
  assert.ok(token);

  const decoded = verifySignedToken(token);
  assert.strictEqual(decoded.id, payload.id);
  assert.strictEqual(decoded.email, payload.email);
  assert.strictEqual(decoded.role, '0');

  // Tampered token test
  const tamperedToken = token.slice(0, -4) + 'abcd';
  assert.strictEqual(verifySignedToken(tamperedToken), null, 'Tampered token signature must fail');

  // Expired token test
  const expiredToken = createSignedToken(payload, -1000);
  assert.strictEqual(verifySignedToken(expiredToken), null, 'Expired token must return null');

  // Test 2: Public Auth Routes should bypass Admin Guard
  let resStatus = null;
  let resJson = null;
  const makeRes = () => ({
    status: (code) => {
      resStatus = code;
      return {
        json: (data) => {
          resJson = data;
        }
      };
    }
  });

  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password'
  ];

  for (const path of publicRoutes) {
    let passed = false;
    await adminApiGuard({ path, headers: {} }, makeRes(), () => { passed = true; });
    assert.strictEqual(passed, true, `Public auth path ${path} must pass without token`);
  }

  // Test 3: Protected Route without token -> 401 Unauthorized
  let protectedPassed = false;
  await adminApiGuard({ path: '/chat', headers: {} }, makeRes(), () => { protectedPassed = true; });
  assert.strictEqual(protectedPassed, false, 'Protected path without token must not pass');
  assert.strictEqual(resStatus, 401);
  assert.strictEqual(resJson.code, 'UNAUTHORIZED');
  assert.ok(resJson.message.includes('Vui lòng đăng nhập'));

  // Test 4: Protected Route with Normal User Token (role '0') -> 403 Forbidden
  const userToken = createSignedToken({ id: 'usr_normal', email: 'normal@example.com', role: '0' });
  protectedPassed = false;
  await adminApiGuard(
    { path: '/chat', headers: { authorization: `Bearer ${userToken}` } },
    makeRes(),
    () => { protectedPassed = true; }
  );
  assert.strictEqual(protectedPassed, false, 'User without Admin role must be blocked');
  assert.strictEqual(resStatus, 403);
  assert.strictEqual(resJson.code, 'FORBIDDEN');
  assert.ok(resJson.message.includes('Chỉ tài khoản Quản trị viên (Admin)'));

  // Test 5: Protected Route with Admin Token (role '1') -> 200 / next()
  const adminToken = createSignedToken({ id: 'usr_admin', email: 'admin@ai-brain.local', role: '1' });
  protectedPassed = false;
  let passedReq = { path: '/chat', headers: { authorization: `Bearer ${adminToken}` } };
  await adminApiGuard(passedReq, makeRes(), () => { protectedPassed = true; });
  assert.strictEqual(protectedPassed, true, 'Admin request must pass successfully');
  assert.ok(passedReq.user, 'req.user must be populated');
  assert.strictEqual(passedReq.user.role, '1');
  assert.strictEqual(isUserAdmin(passedReq.user), true);

  // Test 6: Blocked account cannot access API even with admin token
  const blockedEmail = `blocked_admin_${Date.now()}@example.com`;
  const blockedUser = {
    id: `usr_blocked_${Date.now()}`,
    email: blockedEmail,
    fullName: 'Blocked Admin',
    role: '1',
    status: 'blocked',
    createdAt: new Date().toISOString()
  };
  userRepository.memoryUsers.set(blockedEmail, blockedUser);

  const blockedToken = createSignedToken({ id: blockedUser.id, email: blockedEmail, role: '1' });
  let blockedPassed = false;
  await adminApiGuard(
    { path: '/chat', headers: { authorization: `Bearer ${blockedToken}` } },
    makeRes(),
    () => { blockedPassed = true; }
  );
  assert.strictEqual(blockedPassed, false);
  assert.strictEqual(resStatus, 403);
  assert.strictEqual(resJson.code, 'ACCOUNT_BLOCKED');
  assert.ok(resJson.message.includes('đã bị khóa'));

  console.log('✅ Admin API Guard & HMAC Signed Token Suite passed successfully!');
});
