const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const liveBrowserSessionService = require('../../src/services/social/liveBrowserSession.service');
const socialController = require('../../src/controllers/social.controller');

test('Live Browser Session Service - exports all core methods', () => {
  assert.strictEqual(typeof liveBrowserSessionService.startSession, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.addStreamClient, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.handleInteraction, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.autoFillCredentials, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.autoPasteCaption, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.launchDesktopChrome, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.navigate, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.stopSession, 'function');
  assert.strictEqual(typeof liveBrowserSessionService.broadcastFrame, 'function');
});

test('Live Browser Session Service - returns error when session is not started', async () => {
  const autofillRes = await liveBrowserSessionService.autoFillCredentials({ username: '', password: '' });
  assert.strictEqual(autofillRes.success, false);
  assert.ok(autofillRes.message.length > 0);

  const autopasteRes = await liveBrowserSessionService.autoPasteCaption('');
  assert.strictEqual(autopasteRes.success, false);
  assert.ok(autopasteRes.message.length > 0);

  const interactRes = await liveBrowserSessionService.handleInteraction({ action: 'click', x: 100, y: 100 });
  assert.strictEqual(interactRes.success, false);
  assert.ok(interactRes.message.length > 0);
});

test('Live Browser Session Service - addStreamClient sets up SSE headers', () => {
  let headersSet = null;
  let statusSet = null;
  const writtenData = [];

  const mockRes = {
    writeHead: (status, headers) => {
      statusSet = status;
      headersSet = headers;
    },
    write: (data) => {
      writtenData.push(data);
    },
    on: () => {}
  };

  liveBrowserSessionService.addStreamClient(mockRes);
  assert.strictEqual(statusSet, 200);
  assert.strictEqual(headersSet['Content-Type'], 'text/event-stream');
  assert.ok(writtenData.length > 0);
  assert.ok(writtenData[0].includes('init'));
});

test('Social Controller - contains all Live Browser Session handlers', () => {
  assert.strictEqual(typeof socialController.streamLiveBrowser, 'function');
  assert.strictEqual(typeof socialController.startLiveBrowser, 'function');
  assert.strictEqual(typeof socialController.interactLiveBrowser, 'function');
  assert.strictEqual(typeof socialController.autoFillLiveBrowser, 'function');
  assert.strictEqual(typeof socialController.autoPasteCaptionLiveBrowser, 'function');
  assert.strictEqual(typeof socialController.launchDesktopChrome, 'function');
  assert.strictEqual(typeof socialController.navigateLiveBrowser, 'function');
  assert.strictEqual(typeof socialController.stopLiveBrowser, 'function');
});

test('Social Controller - interactLiveBrowser responds with JSON', async () => {
  let responseData = null;
  const req = { body: { action: 'click', x: 10, y: 20 } };
  const res = {
    json: (d) => { responseData = d; }
  };

  await socialController.interactLiveBrowser(req, res, () => {});
  assert.ok(responseData !== null);
  assert.strictEqual(typeof responseData.success, 'boolean');
});

test('Social Publish Modal HTML - contains Live In-App Browser Canvas & Controls', () => {
  const modalHtmlPath = path.join(__dirname, '../../public/components/socialPublishModal.html');
  const htmlContent = fs.readFileSync(modalHtmlPath, 'utf8');

  assert.ok(htmlContent.includes('id="inAppBrowserModal"'), 'Must have #inAppBrowserModal');
  assert.ok(htmlContent.includes('id="inAppBrowserCanvas"'), 'Must have #inAppBrowserCanvas');
  assert.ok(htmlContent.includes('id="btnInAppAutoFill"'), 'Must have #btnInAppAutoFill');
  assert.ok(htmlContent.includes('id="btnInAppAutoPaste"'), 'Must have #btnInAppAutoPaste');
  assert.ok(htmlContent.includes('id="btnInAppLaunchDesktop"'), 'Must have #btnInAppLaunchDesktop');
  assert.ok(htmlContent.includes('id="inAppBrowserLoadingOverlay"'), 'Must have #inAppBrowserLoadingOverlay');
});

test('Social Publish JS - contains and exports Live In-App Browser methods', () => {
  const jsPath = path.join(__dirname, '../../public/js/socialPublish.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  assert.ok(jsContent.includes('openInAppBrowser'), 'Must have openInAppBrowser');
  assert.ok(jsContent.includes('connectLiveStream'), 'Must have connectLiveStream');
  assert.ok(jsContent.includes('bindCanvasInteractions'), 'Must have bindCanvasInteractions');
  assert.ok(jsContent.includes('sendLiveInteraction'), 'Must have sendLiveInteraction');
  assert.ok(jsContent.includes('autoFillLoginInBrowser'), 'Must have autoFillLoginInBrowser');
  assert.ok(jsContent.includes('pasteCaptionInBrowser'), 'Must have pasteCaptionInBrowser');
  assert.ok(jsContent.includes('launchDesktopChrome'), 'Must have launchDesktopChrome');

  // Check exports inside window.socialPublish
  assert.ok(jsContent.includes('autoFillLoginInBrowser,'), 'Must export autoFillLoginInBrowser');
  assert.ok(jsContent.includes('pasteCaptionInBrowser,'), 'Must export pasteCaptionInBrowser');
  assert.ok(jsContent.includes('launchDesktopChrome,'), 'Must export launchDesktopChrome');
  assert.ok(jsContent.includes('sendLiveInteraction'), 'Must export sendLiveInteraction');
});
