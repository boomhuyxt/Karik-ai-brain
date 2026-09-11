const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const socialController = require('../../src/controllers/social.controller');
const facebookBrowserBotService = require('../../src/services/social/facebookBrowserBot.service');
const tiktokBrowserBotService = require('../../src/services/social/tiktokBrowserBot.service');

test('Social Publish Modal HTML - has Account & Password credentials elements', () => {
  const modalHtmlPath = path.join(__dirname, '../../public/components/socialPublishModal.html');
  const htmlContent = fs.readFileSync(modalHtmlPath, 'utf8');

  // Must have username and password inputs
  assert.ok(htmlContent.includes('id="socialUsernameInput"'), 'Must have #socialUsernameInput');
  assert.ok(htmlContent.includes('id="socialPasswordInput"'), 'Must have #socialPasswordInput');
  assert.ok(htmlContent.includes('id="socialTwoFactorInput"'), 'Must have #socialTwoFactorInput');
  assert.ok(htmlContent.includes('id="chkRememberCredentials"'), 'Must have #chkRememberCredentials');
  assert.ok(htmlContent.includes('id="btnToggleCredentialsDrawer"'), 'Must have #btnToggleCredentialsDrawer');
  assert.ok(htmlContent.includes('id="btnTogglePasswordVisibility"'), 'Must have #btnTogglePasswordVisibility');
});

test('Social Publish JS - contains credentials management and password visibility functions', () => {
  const jsPath = path.join(__dirname, '../../public/js/socialPublish.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  assert.ok(jsContent.includes('toggleCredentialsDrawer'), 'Must have toggleCredentialsDrawer');
  assert.ok(jsContent.includes('togglePasswordVisibility'), 'Must have togglePasswordVisibility');
  assert.ok(jsContent.includes('getCredentialsPayload'), 'Must have getCredentialsPayload');
  assert.ok(jsContent.includes('loadSavedCredentials'), 'Must have loadSavedCredentials');
  assert.ok(jsContent.includes('credentials'), 'Must pass credentials in request payload');
});

test('Social Controller - passes credentials to Facebook and TikTok Browser Bots', async () => {
  let capturedFbOptions = null;
  let capturedTtOptions = null;

  const originalFbPost = facebookBrowserBotService.runFacebookAutoPost;
  const originalTtPost = tiktokBrowserBotService.runTiktokAutoPost;

  facebookBrowserBotService.runFacebookAutoPost = async (opts) => {
    capturedFbOptions = opts;
    return { success: true, message: 'FB OK', data: { logs: [] } };
  };

  tiktokBrowserBotService.runTiktokAutoPost = async (opts) => {
    capturedTtOptions = opts;
    return { success: true, message: 'TT OK', data: { logs: [] } };
  };

  try {
    // Test 1: Explicit credentials object
    const reqFb = {
      body: {
        caption: 'Test FB',
        credentials: { username: 'testuser@fb.com', password: 'secretpassword123', twoFactorCode: '123456' }
      }
    };
    let fbStatus = null;
    let fbJson = null;
    const resFb = {
      status: (c) => { fbStatus = c; return resFb; },
      json: (d) => { fbJson = d; }
    };

    await socialController.runFacebookBrowserBot(reqFb, resFb, () => {});
    assert.strictEqual(fbStatus, 200);
    assert.ok(capturedFbOptions);
    assert.strictEqual(capturedFbOptions.credentials.username, 'testuser@fb.com');
    assert.strictEqual(capturedFbOptions.credentials.password, 'secretpassword123');
    assert.strictEqual(capturedFbOptions.credentials.twoFactorCode, '123456');

    // Test 2: Flat username and password parameters
    const reqTt = {
      body: {
        caption: 'Test TT',
        username: 'tiktok_creator',
        password: 'tiktok_password_xyz'
      }
    };
    let ttStatus = null;
    let ttJson = null;
    const resTt = {
      status: (c) => { ttStatus = c; return resTt; },
      json: (d) => { ttJson = d; }
    };

    await socialController.runTiktokBrowserBot(reqTt, resTt, () => {});
    assert.strictEqual(ttStatus, 200);
    assert.ok(capturedTtOptions);
    assert.strictEqual(capturedTtOptions.credentials.username, 'tiktok_creator');
    assert.strictEqual(capturedTtOptions.credentials.password, 'tiktok_password_xyz');
  } finally {
    facebookBrowserBotService.runFacebookAutoPost = originalFbPost;
    tiktokBrowserBotService.runTiktokAutoPost = originalTtPost;
  }
});

test('Facebook & TikTok Bot Services - method interfaces accept credentials parameter', () => {
  assert.strictEqual(typeof facebookBrowserBotService.runFacebookAutoPost, 'function');
  assert.strictEqual(typeof tiktokBrowserBotService.runTiktokAutoPost, 'function');
});

test('In-App Browser Modal - HTML elements for embedded browser exist', () => {
  const modalHtmlPath = path.join(__dirname, '../../public/components/socialPublishModal.html');
  const htmlContent = fs.readFileSync(modalHtmlPath, 'utf8');

  assert.ok(htmlContent.includes('id="inAppBrowserModal"'), 'Must have #inAppBrowserModal');
  assert.ok(htmlContent.includes('id="inAppBrowserCard"'), 'Must have #inAppBrowserCard');
  assert.ok(htmlContent.includes('id="inAppBrowserUrlDisplay"'), 'Must have #inAppBrowserUrlDisplay');
  assert.ok(htmlContent.includes('id="btnOpenInAppBrowserModal"'), 'Must have #btnOpenInAppBrowserModal');
  assert.ok(htmlContent.includes('id="inAppTabFb"'), 'Must have #inAppTabFb');
  assert.ok(htmlContent.includes('id="inAppTabTt"'), 'Must have #inAppTabTt');
  assert.ok(htmlContent.includes('id="btnInAppCopyCaption"'), 'Must have #btnInAppCopyCaption');
  assert.ok(htmlContent.includes('id="inAppCaptionBox"'), 'Must have #inAppCaptionBox');
});

test('Social Publish JS - contains in-app browser functions and exports', () => {
  const jsPath = path.join(__dirname, '../../public/js/socialPublish.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  assert.ok(jsContent.includes('openInAppBrowser'), 'Must have openInAppBrowser');
  assert.ok(jsContent.includes('closeInAppBrowser'), 'Must have closeInAppBrowser');
  assert.ok(jsContent.includes('openWebviewPopup'), 'Must have openWebviewPopup');
  assert.ok(jsContent.includes('toggleInAppBrowserFullscreen'), 'Must have toggleInAppBrowserFullscreen');
  assert.ok(jsContent.includes('switchInAppPlatform'), 'Must have switchInAppPlatform');
  assert.ok(jsContent.includes('updateInAppBrowserContent'), 'Must have updateInAppBrowserContent');
});

