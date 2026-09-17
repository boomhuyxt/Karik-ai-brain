const test = require('node:test');
const assert = require('node:assert');
const authService = require('../../src/services/auth/auth.service');
const userRepository = require('../../src/repositories/user.repository');

test('AuthService - Register & Login Flow', async (t) => {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Test User';

  // 1. Test registration (must strictly grant default role 0 - User/Chủ Shop)
  const regResult = await authService.register({
    email: testEmail,
    password: testPassword,
    fullName: testName
  });

  assert.strictEqual(regResult.success, true);
  assert.strictEqual(regResult.user.email, testEmail.toLowerCase());
  assert.strictEqual(regResult.user.fullName, testName);
  assert.strictEqual(regResult.user.role, '0', 'New registrations must receive default role 0 (User/Chủ Shop)');
  assert.ok(regResult.token);

  // Test registration with email containing "admin" keyword (must still receive role 0)
  const fakeAdminEmail = `admin_imposter_${Date.now()}@example.com`;
  const fakeAdminReg = await authService.register({
    email: fakeAdminEmail,
    password: testPassword,
    fullName: 'Fake Admin'
  });
  assert.strictEqual(fakeAdminReg.user.role, '0', 'Emails containing "admin" must still receive default role 0');
  const fakeAdminLogin = await authService.login(fakeAdminEmail, testPassword);
  assert.strictEqual(fakeAdminLogin.user.role, '0', 'Logged in fake admin must have role 0');
  userRepository.memoryUsers.delete(fakeAdminEmail.toLowerCase());

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

  // 5. Test Admin dynamic login & role
  const dynamicAdminEmail = `admin_test_${Date.now()}@example.com`;
  userRepository.memoryUsers.set(dynamicAdminEmail, {
    id: `usr_admin_test_${Date.now()}`,
    email: dynamicAdminEmail,
    fullName: 'Test Dynamic Admin',
    passwordHash: require('../../src/utils/crypto').hashPassword('admin123456'),
    role: '1',
    status: 'active',
    createdAt: new Date().toISOString()
  });
  const adminLoginResult = await authService.login(dynamicAdminEmail, 'admin123456');
  assert.strictEqual(adminLoginResult.success, true);
  assert.strictEqual(adminLoginResult.user.role, '1');
  assert.ok(adminLoginResult.token);
  userRepository.memoryUsers.delete(dynamicAdminEmail);

  // 6. Test Forgot Password & Reset Password Flow
  const forgotRes = await authService.forgotPassword(testEmail);
  assert.strictEqual(forgotRes.success, true);
  assert.ok(forgotRes.maskedEmail, 'Should return masked email in forgot password response');
  assert.ok(forgotRes.maskedEmail.startsWith('****'), 'Masked email must start with ****');
  const otpToUse = forgotRes.devOtp || authService.otpStore.get(testEmail.toLowerCase())?.otpCode;
  assert.ok(otpToUse);

  const newPassword = 'NewSecretPassword123!';
  const resetRes = await authService.resetPassword({
    email: testEmail,
    otp: otpToUse,
    newPassword
  });
  assert.strictEqual(resetRes.success, true);

  // Test login with new password
  const newLoginResult = await authService.login(testEmail, newPassword);
  assert.strictEqual(newLoginResult.success, true);

  console.log('✅ Auth Register, Login & OTP Reset Password unit tests passed successfully!');
});

test('Helper - maskEmail format verification', () => {
  const { maskEmail } = require('../../src/utils/helper');
  assert.strictEqual(maskEmail('boomhuyxt@gmail.com'), '****xt@gmail.com');
  assert.strictEqual(maskEmail('caotoan200507@gmail.com'), '****07@gmail.com');
  assert.strictEqual(maskEmail('admin@ai-brain.local'), '****in@ai-brain.local');
  assert.strictEqual(maskEmail('xt@gmail.com'), '****@gmail.com');
  assert.strictEqual(maskEmail(''), '');
});
