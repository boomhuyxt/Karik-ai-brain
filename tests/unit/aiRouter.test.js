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

  // Test 2: Video/Clip Agent Dispatch & Orchestrated Prompt
  const videoAgent = routerService.dispatchAgent('Viết kịch bản clip ngắn TikTok viral');
  assert.strictEqual(videoAgent.id, 'video');
  assert.strictEqual(videoAgent.model, 'gemini-3.1-flash-tts');
  const videoEnriched = routerService.buildOrchestratedPrompt('Viết kịch bản clip ngắn TikTok viral', videoAgent);
  assert.ok(videoEnriched.includes('CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT LÀM CLIP'));
  assert.ok(videoEnriched.includes('video.prompt.md'));
  console.log('✅ Video Agent Dispatch & Prompt Engineering Passed: Model set to Gemini 3.1 Flash TTS');

  // Test 3: Risk & Progress Agent Dispatch & Orchestrated Prompt
  const riskAgent = routerService.dispatchAgent('Kiểm tra độ rủi ro và tiến độ dự án quảng cáo');
  assert.strictEqual(riskAgent.id, 'risk');
  assert.strictEqual(riskAgent.model, 'gemini-3.5-flash-lite');
  const riskEnriched = routerService.buildOrchestratedPrompt('Kiểm tra độ rủi ro và tiến độ dự án quảng cáo', riskAgent);
  assert.ok(riskEnriched.includes('CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT RỦI RO & TIẾN ĐỘ'));
  assert.ok(riskEnriched.includes('risk.prompt.md'));
  console.log('✅ Risk & Progress Agent Dispatch & Prompt Engineering Passed: Model set to Gemini 3.5 Flash Lite');

  // Test 4: Main Orchestrator Agent Dispatch
  const mainAgent = routerService.dispatchAgent('Tổng quan hệ thống AI Karik');
  assert.strictEqual(mainAgent.id, 'orchestrator');
  assert.strictEqual(mainAgent.model, 'gemini-3.5-flash-lite');
  console.log('✅ AI Karik Orchestrator Dispatch Passed: Model set to Gemini 3.5 Flash Lite');

  // Test 5: Tracking Mode Verification
  assert.strictEqual(geminiConfig.trackingMode, 'token');
  console.log('✅ Token-Based Execution Mode Verified: Active (No RPD limits)');

  console.log('✅ All AI Router & Agent Dispatcher Tests Passed successfully!');
} catch (err) {
  console.error('❌ Unit Test Failed:', err.message);
  process.exit(1);
}
