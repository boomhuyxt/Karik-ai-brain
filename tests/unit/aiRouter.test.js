const assert = require('assert');
const routerService = require('../../src/services/ai/router.service');

// Simple assertion test for AI model router
try {
  assert.strictEqual(routerService.selectProvider('Viết code JS', 'coding'), 'openai');
  assert.strictEqual(routerService.selectProvider('Nghiên cứu khoa học', 'research'), 'gemini');
  assert.strictEqual(routerService.selectProvider('Trả lời nhanh', 'chat'), 'groq');
  assert.strictEqual(routerService.selectProvider('Phân tích sâu hợp đồng', 'analysis'), 'claude');
  console.log('✅ Unit Tests Passed: Router Service logic verified successfully!');
} catch (err) {
  console.error('❌ Unit Test Failed:', err.message);
}
