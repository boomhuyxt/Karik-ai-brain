const assert = require('assert');
const routerService = require('../../src/services/ai/router.service');
const geminiConfig = require('../../src/config/gemini');

// Unit Test for AI Karik Multi-Agent Dispatcher & Prompt Engineering Engine
try {
  // Test 1: Image Agent Dispatch & Orchestrated Prompt
  const imageAgent = routerService.dispatchAgent('Tạo ảnh poster quảng cáo đồ uống');
  assert.strictEqual(imageAgent.id, 'image');
  assert.strictEqual(imageAgent.model, 'gemini-3.6-flash');
  const imageEnriched = routerService.buildOrchestratedPrompt('Tạo ảnh poster quảng cáo đồ uống', imageAgent);
  assert.ok(imageEnriched.includes('CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT STUDIO ẢNH'));
  assert.ok(imageEnriched.includes('image.prompt.md'));
  console.log('✅ Image Studio Agent Dispatch & Prompt Engineering Passed: Model set to Gemini 3.6 Flash');

  // Test 2: Social Media & Viral Copywriting Agent Dispatch (Facebook & TikTok)
  const socialAgent = routerService.dispatchAgent('Đăng bài Facebook giới thiệu sản phẩm');
  assert.strictEqual(socialAgent.id, 'social');
  assert.strictEqual(socialAgent.model, geminiConfig.agents.social.model);
  const socialEnriched = routerService.buildOrchestratedPrompt('Đăng bài Facebook giới thiệu sản phẩm', socialAgent);
  assert.ok(socialEnriched.includes('CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT ĐĂNG BÀI MẠNG XÃ HỘI'));
  assert.ok(socialEnriched.includes('QUY TẮC BẮT BUỘC VỀ CAPTION'));
  assert.ok(socialEnriched.includes('social.prompt.md'));
  console.log('✅ Social Agent Dispatch & Product Copy Passed: Model set to ' + socialAgent.model);

  // Test 4: Risk & Progress Agent Dispatch & Orchestrated Prompt
  const riskAgent = routerService.dispatchAgent('Kiểm tra độ rủi ro và tiến độ dự án quảng cáo');
  assert.strictEqual(riskAgent.id, 'risk');
  assert.strictEqual(riskAgent.model, 'gemini-3.5-flash-lite');
  const riskEnriched = routerService.buildOrchestratedPrompt('Kiểm tra độ rủi ro và tiến độ dự án quảng cáo', riskAgent);
  assert.ok(riskEnriched.includes('CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT RỦI RO & TIẾN ĐỘ'));
  assert.ok(riskEnriched.includes('risk.prompt.md'));
  console.log('✅ Risk & Progress Agent Dispatch & Prompt Engineering Passed: Model set to Gemini 3.5 Flash Lite');

  // Test 5: Main Orchestrator Agent Dispatch
  const mainAgent = routerService.dispatchAgent('Tổng quan hệ thống AI Karik');
  assert.strictEqual(mainAgent.id, 'orchestrator');
  assert.strictEqual(mainAgent.model, 'gemini-3.5-flash-lite');
  console.log('✅ AI Karik Orchestrator Dispatch Passed: Model set to Gemini 3.5 Flash Lite');

  // Test 6: Tracking Mode Verification
  assert.strictEqual(geminiConfig.trackingMode, 'token');
  console.log('✅ Token-Based Execution Mode Verified: Active (No RPD limits)');

  console.log('✅ All AI Router & Agent Dispatcher Tests Passed successfully!');
} catch (err) {
  console.error('❌ Unit Test Failed:', err.message);
  process.exit(1);
}
