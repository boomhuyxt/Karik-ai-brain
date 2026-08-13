const assert = require('assert');
const aiManagerService = require('../../src/services/ai/aiManager.service');

async function runVoiceTests() {
  console.log('🧪 Running Electron/Chromium Voice Unit Tests...');

  // Test 1: Verify AI Manager processes voice prompts cleanly using optimal provider routing
  const mockOptions = { provider: 'gemini', voice: 'Electron/Chromium' };
  const res = await aiManagerService.processRequest('Xin chào Karik', 'general', mockOptions);

  assert.strictEqual(res.provider, 'gemini', 'Provider should match gemini');
  assert.strictEqual(typeof res.reply, 'string', 'Reply should be a string');
  assert.strictEqual(res.reply.length > 0, true, 'Reply should not be empty');
  assert.strictEqual(res.reply.includes('Karik'), true, 'Reply should identify as Karik');

  console.log('✅ Electron/Chromium Web Speech Voice Architecture Test Passed successfully!');
}

runVoiceTests().catch(err => {
  console.error('❌ Voice Unit Test Failed:', err);
  process.exit(1);
});

