const test = require('node:test');
const assert = require('node:assert');
const routerService = require('../../src/services/ai/router.service');
const geminiConfig = require('../../src/config/gemini');

test('Image Studio Agent - should be mapped to Studio Designer Persona with Gemini 3.7 Flash', () => {
  const agent = routerService.dispatchAgent('Thiết kế cho tôi poster quảng cáo cà phê');
  assert.strictEqual(agent.id, 'image');
  assert.strictEqual(agent.model, 'gemini-3.7-flash');
  assert.strictEqual(geminiConfig.agents.image.name, 'Agent Studio Ảnh (Gemini 3.7 Flash)');
});

test('RouterService - buildOrchestratedPrompt for image agent includes Studio instructions', () => {
  const prompt = routerService.buildOrchestratedPrompt('Tạo poster quán cà phê', geminiConfig.agents.image, '[STUDIO PERSONALIZATION]: {"mood":"warm"}');
  assert.ok(prompt.includes('AGENT STUDIO ẢNH & POSTER DESIGNER'));
  assert.ok(prompt.includes('image.prompt.md'));
  assert.ok(prompt.includes('Layer Specifications'));
  assert.ok(prompt.includes('STUDIO PERSONALIZATION'));
  assert.ok(prompt.includes('schema 3.0'));
});
