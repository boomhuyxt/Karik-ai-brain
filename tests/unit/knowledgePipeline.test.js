const test = require('node:test');
const assert = require('node:assert');

const knowledgePipelineService = require('../../src/services/knowledge/knowledgePipeline.service');
const githubRepository = require('../../src/repositories/github.repository');

test('KnowledgePipelineService - topic extraction', () => {
  const topic1 = knowledgePipelineService.extractTopic('Giải thích về Docker là gì?');
  assert.strictEqual(topic1, 'Docker');

  const topic2 = knowledgePipelineService.extractTopic('Khái niệm Machine Learning');
  assert.strictEqual(topic2, 'Machine Learning');
});

test('KnowledgePipelineService - learn intent detection', () => {
  assert.strictEqual(knowledgePipelineService.isLearnIntent('Hãy học kiến thức Docker'), true);
  assert.strictEqual(knowledgePipelineService.isLearnIntent('Tiêu thụ bài Linux'), true);
  assert.strictEqual(knowledgePipelineService.isLearnIntent('Giải thích Docker là gì'), false);
});

test('KnowledgePipelineService - saveRawKnowledge & digestToWiki', async () => {
  const topic = 'KubernetesTest';
  const rawResult = await knowledgePipelineService.saveRawKnowledge(topic, 'Tìm hiểu Kubernetes', 'Nội dung thô Kubernetes');
  assert.strictEqual(rawResult.path, `raw/${topic}.md`);

  const rawFile = await githubRepository.getFile(`raw/${topic}.md`);
  assert.ok(rawFile.content.includes('KubernetesTest'));

  const wikiResult = await knowledgePipelineService.digestToWiki(topic, 'Học kiến thức Kubernetes', 'Nội dung bài học', null);
  assert.strictEqual(wikiResult.folder, `wiki/${topic}`);
  assert.strictEqual(wikiResult.chapters.length, 3);
});
