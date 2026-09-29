const test = require('node:test');
const assert = require('node:assert');
const geminiImageService = require('../../src/services/providers/geminiImage.service');
const routerService = require('../../src/services/ai/router.service');

test('Gemini Imagen 3 Dedicated Image Provider Suite', async (t) => {
  // 1. Router Intent Detection Test
  const imagePrompt = 'Vẽ ảnh một chú mèo robot cyberpunk';
  const selectedProvider = routerService.selectProvider(imagePrompt);
  assert.strictEqual(selectedProvider, 'gemini-image');

  // 2. Generate Image Service Test
  const result = await geminiImageService.generateImage('Mèo vàng dễ thương');
  assert.ok(result);
  assert.strictEqual(result.provider, 'gemini-image');
  if (result.imageData) {
    assert.ok(result.imageData.startsWith('data:image/'));
  } else {
    assert.strictEqual(result.success, false);
    assert.match(result.message, /Không thể sinh key visual/);
  }

  console.log('✅ Gemini Imagen 3 dedicated image unit tests passed successfully!');
});
