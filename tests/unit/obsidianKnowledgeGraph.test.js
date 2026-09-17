const { describe, it } = require('node:test');
const assert = require('node:assert');

const knowledgePipelineService = require('../../src/services/knowledge/knowledgePipeline.service');
const githubRepository = require('../../src/repositories/github.repository');
const aiManagerService = require('../../src/services/ai/aiManager.service');
const searchService = require('../../src/services/knowledge/search.service');

describe('--- Obsidian Knowledge Graph & Self-Learning Loop Test Suite ---', () => {

  const samplePrompt = 'Giải thích kiến trúc Clean Architecture trong Node.js và cách chia Repository Pattern';
  const sampleReply = `# Clean Architecture & Repository Pattern trong Node.js

Clean Architecture chia hệ thống thành các tầng độc lập:
1. Entities: Đối tượng nghiệp vụ cốt lõi.
2. Use Cases / Services: Xử lý logic nghiệp vụ.
3. Controllers & Presenters: Điều hướng request.
4. Frameworks & Drivers: Database, Express, Web.

### Hướng dẫn triển khai Repository Pattern:
\`\`\`javascript
class UserRepository {
  async findById(id) {
    return await db.users.find({ id });
  }
}
\`\`\`

### Best Practices & Lưu Ý:
- Không để Controller truy cập thẳng vào Database.
- Tách biệt hoàn toàn logic tầng domain khỏi Express framework.
- Sử dụng Dependency Injection để dễ viết Unit Test.`;

  it('1. Should correctly evaluate knowledge value from conversation (filter trivial vs valuable)', () => {
    // Câu xã giao đơn thuần -> Không học
    assert.strictEqual(knowledgePipelineService.evaluateKnowledgeValue('chào bạn', 'Chào bạn! Mình có thể giúp gì cho bạn hôm nay?'), false);
    assert.strictEqual(knowledgePipelineService.evaluateKnowledgeValue('hello', 'Hi! How can I help you?'), false);
    assert.strictEqual(knowledgePipelineService.evaluateKnowledgeValue('ok', 'Vâng, bạn cần hỗ trợ gì thêm không?'), false);

    // Câu mang tính tri thức, kỹ thuật, code block -> Phải học
    assert.strictEqual(knowledgePipelineService.evaluateKnowledgeValue(samplePrompt, sampleReply), true);

    // Câu có từ khóa yêu cầu học/lưu wiki -> Luôn học
    assert.strictEqual(knowledgePipelineService.evaluateKnowledgeValue('Hãy lưu kiến thức này vào Obsidian cho tôi', 'Nội dung kiến thức...'), true);
  });

  it('2. Should extract clean and safe topic name for Obsidian folder & notes', () => {
    const topic = knowledgePipelineService.extractTopic(samplePrompt);
    assert.ok(topic);
    assert.ok(topic.length >= 3);
    assert.ok(!topic.includes('?'));
    assert.ok(!topic.includes('/'));
    assert.ok(topic.includes('Clean Architecture') || topic.includes('Node.js') || topic.includes('Kiến Trúc'));
  });

  it('3. Should distill conversation into 4 interlinked Atomic Notes with Wikilinks and Obsidian Frontmatter', async () => {
    const topic = 'Clean Architecture Demo';
    const result = await knowledgePipelineService.distillToAtomicNotes(topic, samplePrompt, sampleReply);

    assert.ok(result);
    assert.strictEqual(result.topic, topic);
    assert.strictEqual(result.notesCount, 4);

    // Kiểm tra file MOC (00. Sơ Đồ Tri Thức)
    const mocFile = await githubRepository.getFile(`wiki/${topic}/00. Sơ Đồ Tri Thức ${topic}.md`);
    assert.ok(mocFile.content.includes('---'));
    assert.ok(mocFile.content.includes('type: "moc"'));
    assert.ok(mocFile.content.includes('tags:'));
    assert.ok(mocFile.content.includes(`[[wiki/${topic}/01. Khái Niệm & Nguyên Lý ${topic}|`));
    assert.ok(mocFile.content.includes(`[[wiki/${topic}/02. Kiến Trúc & Triển Khai ${topic}|`));
    assert.ok(mocFile.content.includes(`[[wiki/${topic}/03. Best Practices & Lưu Ý ${topic}|`));

    // Kiểm tra Note Khái niệm (01)
    const conceptFile = await githubRepository.getFile(`wiki/${topic}/01. Khái Niệm & Nguyên Lý ${topic}.md`);
    assert.ok(conceptFile.content.includes(`[[wiki/${topic}/00. Sơ Đồ Tri Thức ${topic}|`));
    assert.ok(conceptFile.content.includes('Entities:'));

    // Kiểm tra Note Triển khai (02)
    const archFile = await githubRepository.getFile(`wiki/${topic}/02. Kiến Trúc & Triển Khai ${topic}.md`);
    assert.ok(archFile.content.includes('UserRepository'));
    assert.ok(archFile.content.includes(`[[wiki/${topic}/00. Sơ Đồ Tri Thức ${topic}|`));

    // Kiểm tra Note Best Practices (03)
    const practiceFile = await githubRepository.getFile(`wiki/${topic}/03. Best Practices & Lưu Ý ${topic}.md`);
    assert.ok(practiceFile.content.includes('Best Practices') || practiceFile.content.includes('Lưu Ý'));
    assert.ok(practiceFile.content.includes(`[[wiki/${topic}/00. Sơ Đồ Tri Thức ${topic}|`));
  });

  it('4. Should refine & enrich existing note, increment version and append changelog when topic is discussed again', async () => {
    const topic = 'Clean Architecture Demo';
    const followUpPrompt = 'Bổ sung thêm nguyên lý Dependency Inversion Principle (DIP) và Inversion of Control (IoC)';
    const followUpReply = `Nguyên lý DIP phát biểu rằng:
1. Module cấp cao không nên phụ thuộc trực tiếp vào module cấp thấp. Cả hai nên phụ thuộc vào abstraction (interface).
2. Abstraction không nên phụ thuộc vào chi tiết; chi tiết nên phụ thuộc vào abstraction.`;

    const refineResult = await knowledgePipelineService.learnFromConversation({
      prompt: followUpPrompt,
      reply: followUpReply,
      topic: topic
    });

    assert.strictEqual(refineResult.learned, true);
    assert.strictEqual(refineResult.action, 'refined');
    assert.strictEqual(refineResult.version, 2);

    // Kiểm tra nội dung MOC đã được làm giàu
    const updatedMoc = await githubRepository.getFile(`wiki/${topic}/00. Sơ Đồ Tri Thức ${topic}.md`);
    assert.ok(updatedMoc.content.includes('version: 2'));
    assert.ok(updatedMoc.content.includes('Cải Tiến & Bổ Sung Tri Thức Mới (v2.0'));
    assert.ok(updatedMoc.content.includes('Dependency Inversion Principle'));
  });

  it('5. Should retrieve relevant Obsidian knowledge during RAG search to empower AI context', async () => {
    const query = 'Clean Architecture Node.js';
    const searchResults = await searchService.vectorSearch(query, 2);

    assert.ok(Array.isArray(searchResults));
    assert.ok(searchResults.length > 0);
  });

  it('6. Should track and return recent learned knowledge notes', () => {
    const recent = knowledgePipelineService.getRecentLearnedNotes(5);
    assert.ok(Array.isArray(recent));
    assert.ok(recent.length > 0);
    assert.ok(recent[0].topic);
    assert.ok(recent[0].mocPath);
  });

});
