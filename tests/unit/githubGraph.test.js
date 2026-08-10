const test = require('node:test');
const assert = require('node:assert');

const graphService = require('../../src/services/obsidian/graph.service');
const dailyService = require('../../src/services/obsidian/daily.service');
const githubRepository = require('../../src/repositories/github.repository');

test('DailyService - should generate correct date path and template', () => {
  const dateObj = new Date('2026-08-07T12:00:00Z');
  const path = dailyService.getTodayPath(dateObj);
  assert.strictEqual(path, 'Daily/2026-08-07.md');

  const template = dailyService.generateDailyTemplate('2026-08-07');
  assert.ok(template.includes('Daily Journal - 2026-08-07'));
  assert.ok(template.includes('Focus & Mục Tiêu'));
});

test('GraphService - should fetch graph nodes and connections from repo tree', async () => {
  const graph = await graphService.getGraphData();
  assert.ok(graph.nodes);
  assert.ok(graph.connections);
  assert.ok(graph.nodes.length > 0, 'Graph should contain markdown nodes');
});

test('GithubRepository - memory fallback file updates', async () => {
  const testPath = 'Daily/test-note.md';
  const updated = await githubRepository.updateFile(testPath, '# Test Content', 'Test commit');
  assert.strictEqual(updated.path, testPath);

  const fetched = await githubRepository.getFile(testPath);
  assert.strictEqual(fetched.content, '# Test Content');
});
