const assert = require('assert');
const aiManagerService = require('../../src/services/ai/aiManager.service');

async function runVoiceTests() {
  console.log('🧪 Running Gemini Voice & TTS Unit Tests...');

  // Test 1: Verify AI Manager accepts TTS options and defaults provider to gemini
  const mockOptions = { tts: true, voice: 'Orus', model: 'gemini-2.5-flash-tts' };
  const res = await aiManagerService.processRequest('Xin chào Jarvis', 'general', mockOptions);

  assert.strictEqual(res.provider, 'gemini', 'Provider for TTS should be routed to gemini');
  assert.strictEqual(res.voice, 'Orus', 'Voice should match Orus');
  assert.strictEqual(typeof res.reply, 'string', 'Reply should be a string');
  assert.strictEqual(res.hasOwnProperty('audioData'), true, 'Response should include audioData property');

  console.log('✅ Gemini 2.5 Flash TTS (Orus Voice) Test Passed: Voice options and routing verified successfully!');
}

runVoiceTests().catch(err => {
  console.error('❌ Voice TTS Test Failed:', err);
  process.exit(1);
});
