const test = require('node:test');
const assert = require('node:assert');
const promptService = require('../../src/services/ai/prompt.service');

test('PromptService - should load system.prompt.md correctly', () => {
  const systemPrompt = promptService.getSystemPrompt();
  assert.strictEqual(typeof systemPrompt, 'string');
  assert.ok(systemPrompt.includes('AI Karik'));
  assert.ok(systemPrompt.includes('Quản Lý Tri Thức Cá Nhân'));
  assert.ok(systemPrompt.length > 50);
});

test('PromptService - should render image prompt with variables', () => {
  const rendered = promptService.getImagePrompt('Quán Cafe Vintage', '16:9');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('Agent Làm Ảnh'));
  assert.ok(rendered.includes('16:9'));
  assert.ok(rendered.includes('pollinations.ai'));
  assert.ok(!rendered.includes('{{aspect_ratio}}'));
});

test('PromptService - should render video prompt with variables', () => {
  const rendered = promptService.getVideoPrompt('Kem chống nắng', 'TikTok');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('Agent Làm Clip'));
  assert.ok(rendered.includes('Hook 3 Giây'));
  assert.ok(rendered.includes('Storyboard'));
  assert.ok(rendered.includes('Runway'));
});

test('PromptService - should render risk prompt with variables', () => {
  const rendered = promptService.getRiskPrompt('Chiến dịch Mùa Hè', 'CTR 3.8%');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('Agent Quản Lý Rủi Ro'));
  assert.ok(rendered.includes('CTR'));
  assert.ok(rendered.includes('ROAS'));
});

test('PromptService - should render coding prompt with variables', () => {
  const rendered = promptService.getCodingPrompt('Viết hàm add', 'function add(a, b) { return a + b; }');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('Viết hàm add'));
  assert.ok(rendered.includes('function add(a, b)'));
  assert.ok(!rendered.includes('{{instruction}}'));
  assert.ok(!rendered.includes('{{code}}'));
});

test('PromptService - should render review prompt with code variable', () => {
  const testCode = 'const x = null; console.log(x.name);';
  const rendered = promptService.getReviewPrompt(testCode);
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes(testCode));
  assert.ok(!rendered.includes('{{code}}'));
});

test('PromptService - should render wiki prompt with topic and context', () => {
  const rendered = promptService.getWikiPrompt('PostgreSQL', 'Cơ sở dữ liệu quan hệ mạnh mẽ');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('PostgreSQL'));
  assert.ok(rendered.includes('Cơ sở dữ liệu quan hệ mạnh mẽ'));
  assert.ok(!rendered.includes('{{topic}}'));
  assert.ok(!rendered.includes('{{context}}'));
});

test('PromptService - should render summary prompt with text', () => {
  const rendered = promptService.getSummaryPrompt('Tài liệu kiến trúc hệ thống phân tán');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('Tài liệu kiến trúc hệ thống phân tán'));
  assert.ok(!rendered.includes('{{text}}'));
});

test('PromptService - should render rag prompt with context and query', () => {
  const rendered = promptService.getRagPrompt('Ngữ cảnh chiến dịch quảng cáo', 'Chiến dịch có rủi ro gì không?');
  assert.strictEqual(typeof rendered, 'string');
  assert.ok(rendered.includes('Ngữ cảnh chiến dịch quảng cáo'));
  assert.ok(rendered.includes('Chiến dịch có rủi ro gì không?'));
  assert.ok(rendered.includes('AI Karik'));
  assert.ok(!rendered.includes('{{context}}'));
  assert.ok(!rendered.includes('{{query}}'));
});

test('PromptService - should list only markdown prompt files and no JS files', () => {
  const files = promptService.listPrompts();
  assert.ok(Array.isArray(files));
  assert.ok(files.length >= 9, 'Should have at least 9 prompt markdown files');
  assert.ok(files.every(file => file.endsWith('.md')), 'All prompt files must end with .md');
  assert.ok(files.every(file => !file.endsWith('.js')), 'No JS files should be in prompts directory');
  assert.ok(files.includes('system.prompt.md'));
  assert.ok(files.includes('image.prompt.md'));
  assert.ok(files.includes('video.prompt.md'));
  assert.ok(files.includes('risk.prompt.md'));
  assert.ok(files.includes('coding.prompt.md'));
  assert.ok(files.includes('review.prompt.md'));
  assert.ok(files.includes('wiki.prompt.md'));
  assert.ok(files.includes('summary.prompt.md'));
  assert.ok(files.includes('rag.prompt.md'));
  assert.ok(files.includes('voice.prompt.md'));
});

test('PromptService - should handle non-existent prompt gracefully', () => {
  const nonExistent = promptService.readPromptMd('non_existent_file.md');
  assert.strictEqual(nonExistent, '');
});

test('PromptService - should support cache clearing and re-reading', () => {
  promptService.clearCache();
  const sys1 = promptService.getSystemPrompt();
  const sys2 = promptService.getSystemPrompt();
  assert.strictEqual(sys1, sys2);
});
