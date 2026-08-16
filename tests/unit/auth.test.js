const test = require('node:test');
const assert = require('node:assert');
const authService = require('../../src/services/auth/auth.service');

test('AuthService - Register & Login Flow', async (t) => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Test User';

  // 1. Test registration
  const regResult = await authService.register({
    email: testEmail,
    password: testPassword,
    fullName: testName
  });

  assert.strictEqual(regResult.success, true);
  assert.strictEqual(regResult.user.email, testEmail.toLowerCase());
  assert.strictEqual(regResult.user.fullName, testName);
  assert.ok(regResult.token);

  // 2. Test duplicate registration error
  await assert.rejects(
    async () => {
      await authService.register({
        email: testEmail,
        password: testPassword,
        fullName: testName
      });
    },
    (err) => err.statusCode === 400
  );

  // 3. Test successful login
  const loginResult = await authService.login(testEmail, testPassword);
  assert.strictEqual(loginResult.success, true);
  assert.strictEqual(loginResult.user.email, testEmail.toLowerCase());
  assert.ok(loginResult.token);

  // 4. Test wrong password login error
  await assert.rejects(
    async () => {
      await authService.login(testEmail, 'WrongPassword!');
    },
    (err) => err.statusCode === 401
  );

  // 5. Test Admin adminAI login & role
  const adminLoginResult = await authService.login('adminAI', 'admin123456');
  assert.strictEqual(adminLoginResult.success, true);
  assert.strictEqual(adminLoginResult.user.role, 'admin');
  assert.ok(adminLoginResult.token);

  // 6. Test Forgot Password & Reset Password Flow
  const forgotRes = await authService.forgotPassword(testEmail);
  assert.strictEqual(forgotRes.success, true);
  assert.ok(forgotRes.devOtp);

  const newPassword = 'NewSecretPassword123!';
  const resetRes = await authService.resetPassword({
    email: testEmail,
    otp: forgotRes.devOtp,
    newPassword
  });
  assert.strictEqual(resetRes.success, true);

  // Test login with new password
  const newLoginResult = await authService.login(testEmail, newPassword);
  assert.strictEqual(newLoginResult.success, true);

  console.log('✅ Auth Register, Login & OTP Reset Password unit tests passed successfully!');
});
