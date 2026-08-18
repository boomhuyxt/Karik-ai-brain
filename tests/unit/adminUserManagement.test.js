const test = require('node:test');
const assert = require('node:assert');
const userRepository = require('../../src/repositories/user.repository');
const authService = require('../../src/services/auth/auth.service');
const adminController = require('../../src/controllers/admin.controller');

test('Admin User Management & Status Blocking Suite', async (t) => {
  const testEmail = `test_admin_user_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // 1. Register a test user
  const regUser = await authService.register({
    email: testEmail,
    password: testPassword,
    fullName: 'Test Violation User'
  });
  assert.strictEqual(regUser.success, true);
  const userId = regUser.user.id;

  // 2. Query all users & check statistics
  const allUsersData = await userRepository.findAllUsers();
  assert.ok(allUsersData.users.length > 0);
  assert.ok(allUsersData.stats.totalUsers > 0);
  assert.ok(allUsersData.stats.activeUsers > 0);

  // 3. Block the user account
  await userRepository.updateUserStatus(userId, 'blocked');

  // 4. Verify blocked user cannot log in
  await assert.rejects(
    async () => {
      await authService.login(testEmail, testPassword);
    },
    (err) => err.statusCode === 403 && err.message.includes('đã bị khóa')
  );

  // 5. Unblock the user account
  await userRepository.updateUserStatus(userId, 'active');

  // 6. Verify user can log in again after unblocking
  const loginResult = await authService.login(testEmail, testPassword);
  assert.strictEqual(loginResult.success, true);

  console.log('✅ Admin User Management & Account Blocking unit tests passed successfully!');
});
