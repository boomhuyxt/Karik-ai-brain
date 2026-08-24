const test = require('node:test');
const assert = require('node:assert');
const pollinationsConfig = require('../../src/config/pollinations');
const pollinationsProvider = require('../../src/providers/pollinations');
const pollinationsService = require('../../src/services/providers/pollinations.service');
const routerService = require('../../src/services/ai/router.service');
const geminiConfig = require('../../src/config/gemini');

test('Pollinations Config - should load endpoint, default model and aspect ratios', () => {
  assert.strictEqual(pollinationsConfig.baseUrl, 'https://image.pollinations.ai/prompt');
  assert.strictEqual(pollinationsConfig.defaultModel, 'flux');
  assert.strictEqual(pollinationsConfig.nologo, true);
  assert.ok(Array.isArray(pollinationsConfig.availableModels));
  assert.strictEqual(pollinationsConfig.aspectRatios['16:9'].width, 1024);
  assert.strictEqual(pollinationsConfig.aspectRatios['16:9'].height, 576);
  assert.strictEqual(pollinationsConfig.aspectRatios['1:1'].width, 1024);
});

test('Image Agent - should be mapped to Pollinations.ai Flux', () => {
  const agent = routerService.dispatchAgent('Vẽ cho tôi ảnh đại dương siêu thực 8k');
  assert.strictEqual(agent.id, 'image');
  assert.strictEqual(agent.model, 'Pollinations.ai (Flux)');
  assert.strictEqual(agent.provider, 'pollinations');
  assert.strictEqual(geminiConfig.agents.image.model, 'Pollinations.ai (Flux)');
});

test('Pollinations Provider & Service - should expose generateImage and ping functions', () => {
  assert.strictEqual(typeof pollinationsProvider.generateImage, 'function');
  assert.strictEqual(typeof pollinationsProvider.ping, 'function');
  assert.strictEqual(typeof pollinationsService.generateImage, 'function');
  assert.strictEqual(typeof pollinationsService.ping, 'function');
});

test('RouterService - should recognize pollinations provider as available', () => {
  assert.strictEqual(routerService.isProviderAvailable('pollinations'), true);
});

test('RouterService - buildOrchestratedPrompt for image agent includes Pollinations.ai instruction', () => {
  const prompt = routerService.buildOrchestratedPrompt('Tạo ảnh poster quán cà phê', geminiConfig.agents.image);
  assert.ok(prompt.includes('Pollinations.ai (Flux)'));
  assert.ok(prompt.includes('image.prompt.md'));
});
