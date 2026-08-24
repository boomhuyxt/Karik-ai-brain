const test = require('node:test');
const assert = require('node:assert');

const userRepo = require('../../src/repositories/user.repository');
const socialAccountRepo = require('../../src/repositories/socialAccount.repository');
const socialPostRepo = require('../../src/repositories/socialPost.repository');
const socialPublisherService = require('../../src/services/social/socialPublisher.service');
const { hashPassword } = require('../../src/utils/crypto');

test('Social Publisher Service & Retry Tests', async (t) => {
  const uid = Date.now();
  const testUser = await userRepo.createUser({
    email: `test_publisher_${uid}@example.com`,
    passwordHash: hashPassword('123456'),
    fullName: 'Publisher Tester',
    role: '1'
  });

  const fbAccount = await socialAccountRepo.save({
    user_id: testUser.id,
    platform: 'facebook',
    account_type: 'personal',
    platform_account_id: `109283_${uid}`,
    account_name: 'Test Facebook Page',
    access_token: 'mock_fb_token_123'
  });

  const ttAccount = await socialAccountRepo.save({
    user_id: testUser.id,
    platform: 'tiktok',
    account_type: 'personal',
    platform_account_id: `tt_${uid}`,
    account_name: 'Test TikTok Channel',
    access_token: 'mock_tt_token_123'
  });

  await t.test('1. Xuất bản Ảnh / Poster lên Facebook thành công', async () => {
    const post = await socialPostRepo.save({
      author_id: testUser.id,
      account_id: fbAccount.id,
      platform: 'facebook',
      media_type: 'image',
      media_urls: ['https://storage.example.com/banner.jpg'],
      caption: 'AI Poster Design',
      hashtags: ['#ai', '#design'],
      status: 'SCHEDULED'
    });

    const res = await socialPublisherService.publishPost(post.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.post.status, 'PUBLISHED');
    assert.ok(res.post.post_external_url);
    assert.ok(res.post.published_at);
  });

  await t.test('2. Xuất bản Video lên Facebook thành công', async () => {
    const post = await socialPostRepo.save({
      author_id: testUser.id,
      account_id: fbAccount.id,
      platform: 'facebook',
      media_type: 'video',
      media_urls: ['https://storage.example.com/video.mp4'],
      caption: 'Facebook Video Reel',
      status: 'SCHEDULED'
    });

    const res = await socialPublisherService.publishPost(post.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.post.status, 'PUBLISHED');
  });

  await t.test('3. Xuất bản Ảnh / Poster (Photo Mode) lên TikTok thành công', async () => {
    const post = await socialPostRepo.save({
      author_id: testUser.id,
      account_id: ttAccount.id,
      platform: 'tiktok',
      media_type: 'poster',
      media_urls: ['https://storage.example.com/tiktok_photo.jpg'],
      caption: 'TikTok AI Photo',
      status: 'SCHEDULED'
    });

    const res = await socialPublisherService.publishPost(post.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.post.status, 'PUBLISHED');
    assert.ok(res.post.post_external_id);
  });

  await t.test('4. Xuất bản Video lên TikTok thành công', async () => {
    const post = await socialPostRepo.save({
      author_id: testUser.id,
      account_id: ttAccount.id,
      platform: 'tiktok',
      media_type: 'video',
      media_urls: ['https://storage.example.com/tiktok_video.mp4'],
      caption: 'TikTok Viral AI Video',
      status: 'SCHEDULED'
    });

    const res = await socialPublisherService.publishPost(post.id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.post.status, 'PUBLISHED');
  });

  await t.test('5. Cơ chế xử lý bài đăng đến hạn (processDuePosts)', async () => {
    // Tạo 1 bài đăng có scheduled_at trong quá khứ
    await socialPostRepo.save({
      author_id: testUser.id,
      account_id: fbAccount.id,
      platform: 'facebook',
      media_type: 'image',
      media_urls: ['https://storage.example.com/scheduled.png'],
      caption: 'Due post',
      status: 'SCHEDULED',
      scheduled_at: new Date(Date.now() - 60000).toISOString()
    });

    const results = await socialPublisherService.processDuePosts();
    assert.ok(results.length >= 1);
    const found = results.find(r => r.success === true);
    assert.ok(found);
  });
});
