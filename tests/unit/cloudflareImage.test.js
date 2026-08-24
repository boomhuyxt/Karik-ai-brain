const test = require('node:test');
const assert = require('node:assert');
const cloudflareConfig = require('../../src/config/cloudflare');
const cloudflareProvider = require('../../src/providers/cloudflare');
const cloudflareService = require('../../src/services/providers/cloudflare.service');
const routerService = require('../../src/services/ai/router.service');
const geminiConfig = require('../../src/config/gemini');

test('Cloudflare Config - should load credentials and models', () => {
  assert.ok(cloudflareConfig.accountId, 'Account ID must be configured');
  assert.ok(cloudflareConfig.apiToken, 'API Token must be configured');
  assert.strictEqual(cloudflareConfig.defaultImageModel, '@cf/black-forest-labs/flux-2-klein-9b');
  assert.strictEqual(cloudflareConfig.baseUrl, 'https://api.cloudflare.com/client/v4');
});

test('Image Agent - should be mapped to Cloudflare Flux.2 Klein 9B', () => {
  const agent = routerService.dispatchAgent('Vẽ cho tôi ảnh đại dương siêu thực 8k');
  assert.strictEqual(agent.id, 'image');
  assert.strictEqual(agent.model, '@cf/black-forest-labs/flux-2-klein-9b');
  assert.strictEqual(agent.provider, 'cloudflare');
  assert.strictEqual(geminiConfig.agents.image.model, '@cf/black-forest-labs/flux-2-klein-9b');
});

test('Cloudflare Provider - should have generateImage and chat functions', () => {
  assert.strictEqual(typeof cloudflareProvider.generateImage, 'function');
  assert.strictEqual(typeof cloudflareProvider.chat, 'function');
  assert.strictEqual(typeof cloudflareService.generateImage, 'function');
  assert.strictEqual(typeof cloudflareService.chat, 'function');
});

test('RouterService - should recognize cloudflare provider as available', () => {
  const isAvailable = routerService.isProviderAvailable('cloudflare');
  assert.strictEqual(isAvailable, true);
});
