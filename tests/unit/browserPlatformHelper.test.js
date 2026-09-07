const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const browserPlatformHelper = require('../../src/services/social/browserPlatformHelper');
const facebookBrowserBotService = require('../../src/services/social/facebookBrowserBot.service');
const tiktokBrowserBotService = require('../../src/services/social/tiktokBrowserBot.service');

test('BrowserPlatformHelper - methods and interface exist', () => {
  assert.strictEqual(typeof browserPlatformHelper.findBrowserExecutable, 'function');
  assert.strictEqual(typeof browserPlatformHelper.getUserDataDir, 'function');
  assert.strictEqual(typeof browserPlatformHelper.getKeyboardModifier, 'function');
  assert.strictEqual(typeof browserPlatformHelper.getModifierLabel, 'function');
  assert.strictEqual(typeof browserPlatformHelper.getLaunchArgs, 'function');
  assert.strictEqual(typeof browserPlatformHelper.isHeadlessRequired, 'function');
  assert.strictEqual(typeof browserPlatformHelper.prepareLocalMediaFile, 'function');
  assert.strictEqual(typeof browserPlatformHelper.launchOrReuseBrowser, 'function');
});

test('BrowserPlatformHelper - keyboard modifier & labels across OS', () => {
  // macOS
  assert.strictEqual(browserPlatformHelper.getKeyboardModifier('darwin'), 'Meta');
  assert.strictEqual(browserPlatformHelper.getModifierLabel('darwin'), 'Cmd');

  // Windows
  assert.strictEqual(browserPlatformHelper.getKeyboardModifier('win32'), 'Control');
  assert.strictEqual(browserPlatformHelper.getModifierLabel('win32'), 'Ctrl');

  // Linux
  assert.strictEqual(browserPlatformHelper.getKeyboardModifier('linux'), 'Control');
  assert.strictEqual(browserPlatformHelper.getModifierLabel('linux'), 'Ctrl');
});

test('BrowserPlatformHelper - getUserDataDir creates and returns OS-appropriate paths', () => {
  // Current OS
  const currentDir = browserPlatformHelper.getUserDataDir('TestSession');
  assert.ok(typeof currentDir === 'string' && currentDir.length > 0);
  assert.ok(fs.existsSync(currentDir), 'Session directory must exist');

  // macOS path pattern
  const macDir = browserPlatformHelper.getUserDataDir('MacSession', 'darwin');
  assert.ok(macDir.includes('Library') && macDir.includes('Application Support'), 'macOS should use Application Support');
  assert.ok(fs.existsSync(macDir));

  // Linux path pattern
  const linuxDir = browserPlatformHelper.getUserDataDir('LinuxSession', 'linux');
  assert.ok(linuxDir.includes('.config') || linuxDir.includes('karik-ai-brain'), 'Linux should use .config/karik-ai-brain');
  assert.ok(fs.existsSync(linuxDir));

  // Windows path pattern
  const winDir = browserPlatformHelper.getUserDataDir('WinSession', 'win32');
  assert.ok(winDir.includes('KarikAIBrain'), 'Windows should use KarikAIBrain');
  assert.ok(fs.existsSync(winDir));
});

test('BrowserPlatformHelper - getLaunchArgs provides platform-tailored flags', () => {
  const darwinArgs = browserPlatformHelper.getLaunchArgs({ customPlatform: 'darwin' });
  assert.ok(darwinArgs.includes('--disable-dev-shm-usage'), 'Must include disable-dev-shm-usage');
  assert.ok(darwinArgs.includes('--no-sandbox'), 'Must include no-sandbox');
  assert.ok(darwinArgs.includes('--window-size=1440,900'), 'macOS should specify standard desktop window size');

  const winArgs = browserPlatformHelper.getLaunchArgs({ customPlatform: 'win32' });
  assert.ok(winArgs.includes('--start-maximized'), 'Windows should specify start-maximized');

  const linuxArgs = browserPlatformHelper.getLaunchArgs({ customPlatform: 'linux' });
  assert.ok(linuxArgs.includes('--disable-dev-shm-usage'), 'Linux should specify disable-dev-shm-usage for memory stability');
});

test('BrowserPlatformHelper - findBrowserExecutable respects environment override', () => {
  const dummyChrome = path.join(__dirname, '../../package.json');
  const oldPath = process.env.CHROME_PATH;
  try {
    process.env.CHROME_PATH = dummyChrome;
    const found = browserPlatformHelper.findBrowserExecutable();
    assert.strictEqual(found, dummyChrome, 'Should prioritize CHROME_PATH environment variable');
  } finally {
    if (oldPath) {
      process.env.CHROME_PATH = oldPath;
    } else {
      delete process.env.CHROME_PATH;
    }
  }
});

test('BrowserPlatformHelper - prepareLocalMediaFile handles Data URLs and paths', async () => {
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const localFile = await browserPlatformHelper.prepareLocalMediaFile(dataUrl, 'test_media');
  assert.ok(localFile);
  assert.ok(fs.existsSync(localFile));
  assert.ok(localFile.endsWith('.png'));
  try { fs.unlinkSync(localFile); } catch (e) {}

  const pkgPath = path.join(__dirname, '../../package.json');
  const direct = await browserPlatformHelper.prepareLocalMediaFile(pkgPath);
  assert.strictEqual(direct, pkgPath);

  const empty = await browserPlatformHelper.prepareLocalMediaFile(null);
  assert.strictEqual(empty, null);
});

test('Facebook & TikTok Browser Bot Services - integrate seamlessly with browserPlatformHelper', () => {
  // Facebook Bot
  assert.strictEqual(typeof facebookBrowserBotService.findBrowserExecutable, 'function');
  assert.strictEqual(typeof facebookBrowserBotService.getUserDataDir, 'function');
  assert.strictEqual(typeof facebookBrowserBotService.prepareLocalMediaFile, 'function');
  const fbUserData = facebookBrowserBotService.getUserDataDir();
  assert.ok(typeof fbUserData === 'string' && fbUserData.length > 0);
  assert.ok(fs.existsSync(fbUserData));

  // TikTok Bot
  assert.strictEqual(typeof tiktokBrowserBotService.findBrowserExecutable, 'function');
  assert.strictEqual(typeof tiktokBrowserBotService.getUserDataDir, 'function');
  assert.strictEqual(typeof tiktokBrowserBotService.prepareLocalMediaFile, 'function');
  const ttUserData = tiktokBrowserBotService.getUserDataDir();
  assert.ok(typeof ttUserData === 'string' && ttUserData.length > 0);
  assert.ok(fs.existsSync(ttUserData));
});
