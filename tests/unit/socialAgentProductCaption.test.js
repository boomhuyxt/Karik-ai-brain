const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const routerService = require('../../src/services/ai/router.service');
const geminiConfig = require('../../src/config/gemini');

test('Social Agent - should route to Social Agent and enforce product-centric caption rules', () => {
  const agent = routerService.dispatchAgent('Đăng bài Facebook bán sản phẩm tai nghe chống ồn');
  assert.strictEqual(agent.id, 'social');
  assert.strictEqual(agent.model, geminiConfig.agents.social.model);

  const prompt = routerService.buildOrchestratedPrompt('Đăng bài bán tai nghe', agent);
  assert.ok(prompt.includes('QUY TẮC BẮT BUỘC VỀ CAPTION'));
  assert.ok(prompt.includes('TUYỆT ĐỐI KHÔNG viết phân tích kỹ thuật về poster'));
  assert.ok(prompt.includes('QUY CHUẨN CANH LỀ & XUỐNG DÒNG CHUẨN FACEBOOK'));
  assert.ok(prompt.includes('AI Vào Trình Duyệt Đăng Bài'));
  assert.ok(prompt.includes('social.prompt.md'));
});

test('Social Prompt Markdown - forbids poster technicalities and requires product-focused copy with Facebook layout rules', () => {
  const promptPath = path.join(__dirname, '../../src/prompts/social.prompt.md');
  assert.ok(fs.existsSync(promptPath));
  const content = fs.readFileSync(promptPath, 'utf8');

  assert.ok(content.includes('TẬP TRUNG 100% VÀO SẢN PHẨM / DỊCH VỤ'));
  assert.ok(content.includes('KHÔNG ĐƯỢC viết nội dung mô tả hay phân tích kỹ thuật về Poster'));
  assert.ok(content.includes('Chuẩn Canh Lề & Bố Cục Facebook'));
  assert.ok(content.includes('Khoảng thở giữa các đoạn'));
  assert.ok(content.includes('AI Vào Trình Duyệt Đăng Bài'));
});

test('Social Publish Modal HTML - has live Facebook preview card and auto format button', () => {
  const modalPath = path.join(__dirname, '../../public/components/socialPublishModal.html');
  assert.ok(fs.existsSync(modalPath));
  const html = fs.readFileSync(modalPath, 'utf8');

  assert.ok(!html.includes('id="btnAutoPublishDirect"'), 'Should NOT have direct API publish button');
  assert.ok(html.includes('id="btnBrowserBotFB"'), 'Should have Browser Bot FB button');
  assert.ok(html.includes('AI Xem Trước & Xác Nhận Đăng Bài'), 'Should have Review & Confirmation heading');
  assert.ok(html.includes('reloadStudioImage()'), 'Should have Studio image reload button');
  assert.ok(html.includes('id="fbLivePreviewCard"'), 'Should have Facebook Live Feed Preview card');
  assert.ok(html.includes('id="btnAutoFormatFB"'), 'Should have 1-click Auto Format FB button');
  assert.ok(html.includes('id="tabViewPreview"'), 'Should have preview tab');
});

test('Social Publish JS - contains auto format and live feed preview handlers', () => {
  const publishJsPath = path.join(__dirname, '../../public/js/socialPublish.js');
  assert.ok(fs.existsSync(publishJsPath));
  const js = fs.readFileSync(publishJsPath, 'utf8');

  assert.ok(js.includes('autoFormatFacebookText'), 'Should contain autoFormatFacebookText function');
  assert.ok(js.includes('updateLivePreview'), 'Should contain updateLivePreview function');
  assert.ok(js.includes('toggleViewMode'), 'Should contain toggleViewMode function');
});

test('Frontend Markdown - drawer enables breaks: true and index has chat-markdown styling', () => {
  const drawerPath = path.join(__dirname, '../../public/js/drawer.js');
  const drawerJs = fs.readFileSync(drawerPath, 'utf8');
  assert.ok(drawerJs.includes('breaks: true'), 'drawer.js should enable breaks: true in marked');

  const indexPath = path.join(__dirname, '../../public/index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexHtml.includes('.chat-markdown'), 'index.html should define .chat-markdown CSS');
  assert.ok(indexHtml.includes('.fb-post-preview'), 'index.html should define .fb-post-preview CSS');
});

test('Chat JS - contains link for Studio image, browser bot trigger, and chat-markdown class', () => {
  const chatJsPath = path.join(__dirname, '../../public/js/chat.js');
  const js = fs.readFileSync(chatJsPath, 'utf8');

  assert.ok(js.includes('window.lastStudioEditedImage'), 'Chat JS should track lastStudioEditedImage');
  assert.ok(js.includes('window.lastProductCaption'), 'Chat JS should track lastProductCaption');
  assert.ok(js.includes('AI Vào Trình Duyệt Đăng Bài'), 'Card should display AI Browser Bot button');
  assert.ok(js.includes('chat-markdown'), 'Message container should have chat-markdown class');
});

test('Facebook Browser Bot - handles base64 studio images and multi-tier formatting preservation', async () => {
  const botService = require('../../src/services/social/facebookBrowserBot.service');
  assert.ok(typeof botService.prepareLocalMediaFile === 'function');

  // Test converting a minimal base64 PNG dataUrl
  const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const localFile = await botService.prepareLocalMediaFile(sampleDataUrl);
  assert.ok(localFile, 'Should return a local file path');
  assert.ok(fs.existsSync(localFile), 'Saved file should exist on disk');

  // Clean up
  try { fs.unlinkSync(localFile); } catch (e) {}

  // Check that the bot file contains 3-tier insertion logic
  const botFileContent = fs.readFileSync(path.join(__dirname, '../../src/services/social/facebookBrowserBot.service.js'), 'utf8');
  assert.ok(botFileContent.includes('ClipboardEvent'), 'Should use ClipboardEvent paste');
  assert.ok(botFileContent.includes('DataTransfer'), 'Should use DataTransfer for preserving paragraphs');
});

test('Image Editor JS - passes product caption when posting to Facebook from Studio', () => {
  const editorJsPath = path.join(__dirname, '../../public/js/imageEditor.js');
  const js = fs.readFileSync(editorJsPath, 'utf8');

  assert.ok(js.includes('window.lastProductCaption'), 'Image editor should pass product caption to social modal');
  assert.ok(js.includes('window.lastStudioEditedImage'), 'Image editor should set lastStudioEditedImage');
});
