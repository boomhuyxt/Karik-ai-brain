const test = require('node:test');
const assert = require('node:assert');

const userRepo = require('../../src/repositories/user.repository');
const socialAccountRepo = require('../../src/repositories/socialAccount.repository');
const socialPostRepo = require('../../src/repositories/socialPost.repository');
const socialApprovalService = require('../../src/services/social/socialApproval.service');
const { hashPassword } = require('../../src/utils/crypto');

test('Social Approval & Permission Matrix Tests', async (t) => {
  const pwd = hashPassword('TestPassword123');
  const uid = Date.now();

  const user1 = await userRepo.createUser({
    email: `test_user1_${uid}@example.com`,
    passwordHash: pwd,
    fullName: 'Test User 1',
    role: '0'
  });

  const user2 = await userRepo.createUser({
    email: `test_user2_${uid}@example.com`,
    passwordHash: pwd,
    fullName: 'Test User 2',
    role: '0'
  });

  const adminUser = await userRepo.createUser({
    email: `test_admin_${uid}@example.com`,
    passwordHash: pwd,
    fullName: 'Test Admin',
    role: '1'
  });

  const userPersonalFb = await socialAccountRepo.save({
    user_id: user1.id,
    platform: 'facebook',
    account_type: 'personal',
    platform_account_id: `fb_page_${uid}_user1`,
    account_name: 'User 1 Personal Page',
    access_token: 'mock_token_fb_user1'
  });

  const adminSystemFb = await socialAccountRepo.save({
    user_id: adminUser.id,
    platform: 'facebook',
    account_type: 'admin_system',
    platform_account_id: `fb_page_${uid}_official`,
    account_name: 'Jarvis Official Fanpage',
    access_token: 'mock_token_fb_admin'
  });

  const adminSystemTiktok = await socialAccountRepo.save({
    user_id: adminUser.id,
    platform: 'tiktok',
    account_type: 'admin_system',
    platform_account_id: `tt_channel_${uid}_official`,
    account_name: 'Jarvis Official TikTok',
    access_token: 'mock_token_tt_admin'
  });

  await t.test('1. User đăng lên tài khoản cá nhân -> Tự động SCHEDULED (Không cần duyệt)', async () => {
    const res = await socialApprovalService.createPostRequest({
      user: user1,
      accountId: userPersonalFb.id,
      mediaType: 'image',
      mediaUrls: ['https://example.com/poster1.png'],
      caption: 'My cool new AI poster!',
      hashtags: ['#ai', '#design']
    });

    assert.strictEqual(res.requiresApproval, false);
    assert.strictEqual(res.post.status, 'SCHEDULED');
    assert.strictEqual(res.post.author_id, user1.id);
  });

  await t.test('2. User đăng lên kênh Admin/Hệ thống -> Chuyển PENDING_APPROVAL (Cần Admin duyệt)', async () => {
    const res = await socialApprovalService.createPostRequest({
      user: user1,
      accountId: adminSystemFb.id,
      mediaType: 'poster',
      mediaUrls: ['https://example.com/system-banner.png'],
      caption: 'Đề xuất đăng banner lên Fanpage công ty',
      hashtags: ['#company', '#news']
    });

    assert.strictEqual(res.requiresApproval, true);
    assert.strictEqual(res.post.status, 'PENDING_APPROVAL');
    assert.strictEqual(res.post.author_id, user1.id);
  });

  await t.test('3. User cố tình đăng lên tài khoản cá nhân của người khác -> Bị từ chối (403 Forbidden)', async () => {
    await assert.rejects(
      async () => {
        await socialApprovalService.createPostRequest({
          user: user2,
          accountId: userPersonalFb.id, // Account of user1
          mediaType: 'image',
          mediaUrls: ['https://example.com/hack.png']
        });
      },
      (err) => {
        assert.strictEqual(err.status, 403);
        return true;
      }
    );
  });

  await t.test('4. Admin duyệt bài (APPROVED) -> Trạng thái đổi thành SCHEDULED', async () => {
    // Tạo bài chờ duyệt
    const { post } = await socialApprovalService.createPostRequest({
      user: user1,
      accountId: adminSystemTiktok.id,
      mediaType: 'video',
      mediaUrls: ['https://example.com/review-video.mp4'],
      caption: 'TikTok AI Video Review'
    });
    assert.strictEqual(post.status, 'PENDING_APPROVAL');

    // Admin duyệt
    const reviewRes = await socialApprovalService.reviewPost({
      adminUser,
      postId: post.id,
      status: 'APPROVED',
      reviewNote: 'Nội dung rất tốt, duyệt lên lịch đăng!'
    });

    assert.strictEqual(reviewRes.post.status, 'SCHEDULED');
    assert.strictEqual(reviewRes.post.reviewed_by, adminUser.id);
    assert.strictEqual(reviewRes.post.review_note, 'Nội dung rất tốt, duyệt lên lịch đăng!');
  });

  await t.test('5. Admin từ chối bài (REJECTED) -> Trạng thái đổi thành REJECTED', async () => {
    // Tạo bài chờ duyệt
    const { post } = await socialApprovalService.createPostRequest({
      user: user1,
      accountId: adminSystemFb.id,
      mediaType: 'image',
      mediaUrls: ['https://example.com/bad-poster.png'],
      caption: 'Poster không đạt chuẩn'
    });

    // Admin từ chối
    const reviewRes = await socialApprovalService.reviewPost({
      adminUser,
      postId: post.id,
      status: 'REJECTED',
      reviewNote: 'Hình ảnh độ phân giải thấp, vui lòng tạo lại.'
    });

    assert.strictEqual(reviewRes.post.status, 'REJECTED');
    assert.strictEqual(reviewRes.post.review_note, 'Hình ảnh độ phân giải thấp, vui lòng tạo lại.');
  });

  await t.test('6. Admin tạo bài đăng trực tiếp -> Tự động SCHEDULED không cần qua bước duyệt', async () => {
    const res = await socialApprovalService.createPostRequest({
      user: adminUser,
      accountId: adminSystemFb.id,
      mediaType: 'poster',
      mediaUrls: ['https://example.com/admin-poster.png'],
      caption: 'Official announcement from admin'
    });

    assert.strictEqual(res.requiresApproval, false);
    assert.strictEqual(res.post.status, 'SCHEDULED');
  });
});
