const test = require('node:test');
const assert = require('node:assert');
const dashboardService = require('../../src/services/dashboard/dashboard.service');

test('DashboardService - should evaluate API risks and health matrix', async () => {
  const apiHealth = await dashboardService.evaluateApiRisks();
  assert.ok(apiHealth);
  assert.strictEqual(typeof apiHealth.overallRiskScore, 'number');
  assert.ok(apiHealth.apis.length >= 5, 'Should evaluate at least 5 linked APIs');

  const geminiApi = apiHealth.apis.find(a => a.id === 'gemini');
  assert.ok(geminiApi, 'Gemini API should be present in risk evaluation');
  assert.strictEqual(geminiApi.status, 'connected');
  assert.ok(geminiApi.riskScore <= 20, 'Gemini API risk score should be low');

  const supabaseApi = apiHealth.apis.find(a => a.id === 'supabase');
  assert.ok(supabaseApi, 'Supabase API should be present in risk evaluation');
});

test('DashboardService - should return project marketing campaigns and progress', () => {
  const campaigns = dashboardService.getProjectCampaigns();
  assert.ok(Array.isArray(campaigns));
  assert.ok(campaigns.length >= 4, 'Should have at least 4 active project campaigns');

  const tiktokCamp = campaigns.find(c => c.id === 'camp_tiktok_reels');
  assert.ok(tiktokCamp);
  assert.strictEqual(tiktokCamp.progress, 85);
  assert.ok(tiktokCamp.metrics.ctr);
  assert.ok(tiktokCamp.metrics.roas);
});

test('DashboardService - should return token analytics breakdown by agent and provider', async () => {
  const tokenAnalytics = await dashboardService.getTokenAnalytics();
  assert.ok(tokenAnalytics);
  assert.strictEqual(tokenAnalytics.trackingMode, 'token');
  assert.ok(Array.isArray(tokenAnalytics.agents));
  assert.strictEqual(tokenAnalytics.agents.length, 4, 'Should have 4 specialized agents');

  const orchestrator = tokenAnalytics.agents.find(a => a.id === 'orchestrator');
  const videoAgent = tokenAnalytics.agents.find(a => a.id === 'video');
  const imageAgent = tokenAnalytics.agents.find(a => a.id === 'image');
  const riskAgent = tokenAnalytics.agents.find(a => a.id === 'risk');

  assert.ok(orchestrator);
  assert.ok(videoAgent);
  assert.ok(imageAgent);
  assert.ok(riskAgent);
});

test('DashboardService - should return consolidated dashboard data', async () => {
  const data = await dashboardService.getDashboardData();
  assert.ok(data.vault);
  assert.ok(data.tokens);
  assert.ok(data.projects);
  assert.ok(data.apiHealth);
});
