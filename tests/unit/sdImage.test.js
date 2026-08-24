const test = require('node:test');
const assert = require('node:assert');
const sdConfig = require('../../src/config/stableDiffusion');
const sdProvider = require('../../src/providers/stableDiffusion');
const sdService = require('../../src/services/providers/stableDiffusion.service');
const routerService = require('../../src/services/ai/router.service');
const geminiConfig = require('../../src/config/gemini');

test('Stable Diffusion Config - should load local API endpoint and defaults', () => {
  assert.strictEqual(sdConfig.apiUrl, 'http://127.0.0.1:7860/sdapi/v1/txt2img');
  assert.strictEqual(sdConfig.baseUrl, 'http://127.0.0.1:7860');
  assert.strictEqual(sdConfig.steps, 20);
  assert.strictEqual(sdConfig.cfgScale, 7);
  assert.strictEqual(sdConfig.samplerName, 'Euler a');
  assert.ok(sdConfig.negativePrompt);
  assert.strictEqual(sdConfig.aspectRatios['1:1'].width, 512);
  assert.strictEqual(sdConfig.aspectRatios['16:9'].width, 768);
});

test('Image Agent - should be mapped to Stable Diffusion WebUI', () => {
  const agent = routerService.dispatchAgent('Vẽ cho tôi ảnh đại dương siêu thực 8k');
  assert.strictEqual(agent.id, 'image');
  assert.strictEqual(agent.model, 'Stable Diffusion WebUI (txt2img)');
  assert.strictEqual(agent.provider, 'stableDiffusion');
  assert.strictEqual(geminiConfig.agents.image.model, 'Stable Diffusion WebUI (txt2img)');
});

test('Stable Diffusion Provider & Service - should expose generateImage and ping functions', () => {
  assert.strictEqual(typeof sdProvider.generateImage, 'function');
  assert.strictEqual(typeof sdProvider.ping, 'function');
  assert.strictEqual(typeof sdService.generateImage, 'function');
  assert.strictEqual(typeof sdService.ping, 'function');
});

test('RouterService - should recognize stableDiffusion and sd providers as available', () => {
  assert.strictEqual(routerService.isProviderAvailable('stableDiffusion'), true);
  assert.strictEqual(routerService.isProviderAvailable('sd'), true);
});

test('RouterService - buildOrchestratedPrompt for image agent includes SD WebUI instruction', () => {
  const prompt = routerService.buildOrchestratedPrompt('Tạo ảnh poster quán cà phê', geminiConfig.agents.image);
  assert.ok(prompt.includes('Stable Diffusion WebUI'));
  assert.ok(prompt.includes('image.prompt.md'));
});
