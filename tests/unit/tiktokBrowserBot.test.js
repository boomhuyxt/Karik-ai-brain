const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const tiktokBrowserBotService = require('../../src/services/social/tiktokBrowserBot.service');
const socialController = require('../../src/controllers/social.controller');

test('TikTok Browser Bot Service - methods and structure exist', () => {
  assert.strictEqual(typeof tiktokBrowserBotService.findBrowserExecutable, 'function');
  assert.strictEqual(typeof tiktokBrowserBotService.getUserDataDir, 'function');
  assert.strictEqual(typeof tiktokBrowserBotService.prepareLocalMediaFile, 'function');
  assert.strictEqual(typeof tiktokBrowserBotService.runTiktokAutoPost, 'function');

  const userDataDir = tiktokBrowserBotService.getUserDataDir();
  assert.ok(typeof userDataDir === 'string' && userDataDir.length > 0);
  assert.ok(fs.existsSync(userDataDir));
});

test('TikTok Browser Bot Service - prepareLocalMediaFile handles Data URLs and local paths', async () => {
  // Test Data URL
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const filePath = await tiktokBrowserBotService.prepareLocalMediaFile(dataUrl);
  assert.ok(filePath);
  assert.ok(fs.existsSync(filePath));
  assert.ok(filePath.endsWith('.png'));

  // Cleanup
  try { fs.unlinkSync(filePath); } catch (e) {}

  // Test Direct Path
  const packageJsonPath = path.join(__dirname, '../../package.json');
  const resolved = await tiktokBrowserBotService.prepareLocalMediaFile(packageJsonPath);
  assert.strictEqual(resolved, packageJsonPath);

  // Test Null / Empty
  const emptyRes = await tiktokBrowserBotService.prepareLocalMediaFile(null);
  assert.strictEqual(emptyRes, null);
});

test('Social Controller - has runTiktokBrowserBot action', async () => {
  assert.strictEqual(typeof socialController.runTiktokBrowserBot, 'function');

  const req = {
    body: {
      caption: 'Test TikTok post',
      hashtags: ['#test', '#tiktok'],
      mediaUrls: []
    }
  };

  let respondedJson = null;
  let respondedStatus = null;
  const res = {
    status(code) {
      respondedStatus = code;
      return this;
    },
    json(data) {
      respondedJson = data;
      return this;
    }
  };

  // Mock service
  const originalRun = tiktokBrowserBotService.runTiktokAutoPost;
  tiktokBrowserBotService.runTiktokAutoPost = async (opts) => {
    return {
      success: true,
      message: 'Mock TikTok auto post success',
      logs: ['Log 1', 'Log 2']
    };
  };

  try {
    await socialController.runTiktokBrowserBot(req, res, () => {});
    assert.strictEqual(respondedStatus, 200);
    assert.strictEqual(respondedJson.success, true);
    assert.strictEqual(respondedJson.data.message, 'Mock TikTok auto post success');
  } finally {
    tiktokBrowserBotService.runTiktokAutoPost = originalRun;
  }
});

test('Social Publish HTML & JS - contain TikTok Browser Bot integration', () => {
  const modalPath = path.join(__dirname, '../../public/components/socialPublishModal.html');
  const modalHtml = fs.readFileSync(modalPath, 'utf8');

  assert.ok(modalHtml.includes('tabBtnTiktok'), 'Modal should have TikTok tab');
  assert.ok(modalHtml.includes('triggerActiveBrowserBot'), 'Modal button should trigger active browser bot');
  assert.ok(modalHtml.includes('TikTok Studio'), 'Modal should mention TikTok Studio');

  const jsPath = path.join(__dirname, '../../public/js/socialPublish.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  assert.ok(jsContent.includes('runBrowserBotTiktok'), 'socialPublish.js should have runBrowserBotTiktok');
  assert.ok(jsContent.includes('triggerActiveBrowserBot'), 'socialPublish.js should have triggerActiveBrowserBot');
  assert.ok(jsContent.includes('/api/social/browser-bot/tiktok'), 'socialPublish.js should call TikTok bot endpoint');
  assert.ok(jsContent.includes("botBtnText.textContent = '🤖 Đồng Ý & Cho AI Vào TikTok Studio Đăng Bài'"), 'socialPublish.js should update button text to TikTok');
  assert.ok(jsContent.includes("tabPreviewText.textContent = 'Xem Trước Feed TikTok'"), 'socialPublish.js should update tab preview text to TikTok');
});

