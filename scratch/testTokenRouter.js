const aiManager = require('../src/services/ai/aiManager.service');

async function testTokenRouter() {
  console.log('🔄 Sending test request to TokenRouter (deepseek/deepseek-v4-pro-0813-free)...');
  try {
    const res = await aiManager.processRequest('Hãy giới thiệu 1 câu ngắn gọn về bạn', 'chat', { provider: 'tokenrouter' });
    console.log('✅ Response from TokenRouter DeepSeek:', res);
  } catch (err) {
    console.error('❌ TokenRouter Test Error:', err);
  }
}

testTokenRouter();
