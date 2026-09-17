const githubRepository = require('../../repositories/github.repository');
const indexService = require('./index.service');

class KnowledgePipelineService {
  constructor() {
    this.recentLearnedNotes = [];
    this.MAX_RECENT = 20;
  }

  /**
   * Đánh giá xem cuộc hội thoại có chứa tri thức giá trị cần lưu vào Obsidian không
   * @param {string} prompt 
   * @param {string} reply 
   * @returns {boolean}
   */
  evaluateKnowledgeValue(prompt = '', reply = '') {
    if (!prompt || !reply) return false;
    const cleanPrompt = prompt.trim().toLowerCase();
    const cleanReply = reply.trim();

    // 1. Loại bỏ các câu xã giao ngắn, không chứa tri thức
    const trivialGreetings = [
      'chào bạn', 'xin chào', 'hello', 'hi', 'hey', 'bạn là ai', 
      'alo', 'test', 'cảm ơn', 'cam on', 'ok', 'oke', 'thanks', 'bye', 'tạm biệt'
    ];
    if (trivialGreetings.some(g => cleanPrompt === g || cleanPrompt === g + '.' || cleanPrompt === g + '!')) {
      return false;
    }

    // 2. Nếu người dùng chủ động có ý định học, lưu trữ, nghiên cứu
    if (this.isLearnIntent(prompt)) {
      return true;
    }

    // 3. Câu trả lời của AI phải đủ độ sâu (> 120 ký tự và có cấu trúc giải thích)
    if (cleanReply.length < 120) {
      return false;
    }

    // 4. Có chứa các dấu hiệu của tri thức: code block, danh sách, từ khóa kỹ thuật/khái niệm
    const hasCodeBlock = cleanReply.includes('```');
    const hasListItems = /^[*-]\s+/m.test(cleanReply) || /^\d+\.\s+/m.test(cleanReply);
    const hasHeadings = /^#{1,4}\s+/m.test(cleanReply);
    const hasKnowledgeKeywords = [
      'khái niệm', 'nguyên lý', 'cấu trúc', 'kiến trúc', 'hướng dẫn', 
      'cách sử dụng', 'bước 1', 'lưu ý', 'tối ưu', 'ưu điểm', 'nhược điểm',
      'phương pháp', 'giải pháp', 'thuật toán', 'mô hình', 'quy trình',
      'cú pháp', 'lệnh', 'command', 'config', 'setup', 'triển khai',
      'pattern', 'architecture', 'best practice', 'function', 'class'
    ].some(kw => cleanReply.toLowerCase().includes(kw) || cleanPrompt.includes(kw));

    return (hasCodeBlock || hasListItems || hasHeadings) && (hasKnowledgeKeywords || cleanReply.length > 250);
  }

  /**
   * Trích xuất chủ đề (Topic) ngắn gọn, chuẩn hóa tên thư mục/file Obsidian
   * @param {string} prompt 
   * @param {string} reply 
   * @returns {string}
   */
  extractTopic(prompt, reply = '') {
    if (!prompt) return 'Ghi-Chu-Tri-Thuc';

    let clean = prompt
      .replace(/^(hỏi|hãy|cho|tôi|biết|giải|thích|về|học|tiêu|thụ|master|tổng|hợp|khái|niệm|tìm|hiểu|cách|hướng|dẫn|làm|thế|nào|\s)+/gi, '')
      .replace(/(là gì|thế nào|như thế nào|như nào|ra sao|cho tôi|giúp tôi|\?|\!)+/gi, '')
      .trim();

    if (!clean || clean.length < 2) {
      clean = prompt.split(/\s+/).slice(0, 3).join(' ') || 'Tri-Thuc';
    }

    // Giữ tối đa 4 từ mang ý nghĩa chính
    const words = clean.split(/\s+/).slice(0, 4);
    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const safeTopic = capitalized.replace(/[/\\?%*:|"<>]/g, '').trim();

    return safeTopic || 'Ghi-Chu-Tri-Thuc';
  }

  /**
   * Nhận diện xem prompt có phải yêu cầu chủ động học/đóng gói Wiki không
   */
  isLearnIntent(prompt) {
    const lower = (prompt || '').toLowerCase();
    return (
      lower.includes('học') ||
      lower.includes('tiêu thụ') ||
      lower.includes('digest') ||
      lower.includes('master') ||
      lower.includes('chuyển wiki') ||
      lower.includes('tổng hợp wiki') ||
      lower.includes('lưu vào obsidian') ||
      lower.includes('tạo ghi chú') ||
      lower.includes('lưu kiến thức') ||
      lower.includes('sơ đồ tri thức')
    );
  }

  /**
   * Quét các note sẵn có trong Obsidian Vault để tìm liên kết chéo (Cross-links)
   */
  async findExistingRelatedVaultNotes(topic, keywords = []) {
    try {
      const tree = await githubRepository.getTree();
      if (!Array.isArray(tree)) return [];

      const cleanTopic = topic.toLowerCase();
      const matched = [];

      for (const item of tree) {
        if (!item.path || !item.path.endsWith('.md')) continue;
        const notePath = item.path.replace(/\.md$/, '');
        const noteName = notePath.split('/').pop();
        const noteLower = noteName.toLowerCase();

        // Tránh tự link vào chính thư mục/note hiện tại
        if (notePath.includes(`wiki/${topic}`) || noteLower === cleanTopic) continue;

        const isRelated = keywords.some(kw => kw && kw.length > 2 && noteLower.includes(kw.toLowerCase()));
        if (isRelated && !matched.includes(notePath)) {
          matched.push({
            path: notePath,
            name: noteName,
            wikilink: `[[${notePath}|${noteName}]]`
          });
        }

        if (matched.length >= 5) break; // Tối đa 5 liên kết gợi ý
      }

      return matched;
    } catch (e) {
      return [];
    }
  }

  /**
   * Tự động phân rã tri thức thành các Atomic Notes liên kết nhau (Obsidian Knowledge Graph)
   */
  async distillToAtomicNotes(topic, prompt, aiReply, providerInstance = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const folder = `wiki/${topic}`;

    // 1. Tìm các liên kết sẵn có trong kho Obsidian
    const relatedVaultNotes = await this.findExistingRelatedVaultNotes(topic, [
      topic,
      ...prompt.split(/\s+/).filter(w => w.length > 3)
    ]);

    const vaultLinksSection = relatedVaultNotes.length > 0
      ? `\n### 🌐 Liên Kết Mạng Lưới Vault (Cross-Links)\n` + relatedVaultNotes.map(n => `- ${n.wikilink}`).join('\n')
      : `\n### 🌐 Liên Kết Mạng Lưới Vault (Cross-Links)\n- [[wiki/Tong-Quan-Tri-Thuc|Tổng Quan Tri Thức Hệ Thống]]`;

    // 2. Định nghĩa đường dẫn các Note trong cụm
    const mocPath = `${folder}/00. Sơ Đồ Tri Thức ${topic}.md`;
    const conceptPath = `${folder}/01. Khái Niệm & Nguyên Lý ${topic}.md`;
    const archPath = `${folder}/02. Kiến Trúc & Triển Khai ${topic}.md`;
    const practicePath = `${folder}/03. Best Practices & Lưu Ý ${topic}.md`;

    // 3. Tách nội dung reply thành các phần tương ứng
    const lines = aiReply.split('\n');
    let conceptText = '';
    let archText = '';
    let practiceText = '';

    // Phân loại đoạn văn thông minh
    let currentSection = 'concept';
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('kiến trúc') || lower.includes('triển khai') || lower.includes('cài đặt') || lower.includes('cú pháp') || lower.includes('code') || line.startsWith('```')) {
        currentSection = 'arch';
      } else if (lower.includes('lưu ý') || lower.includes('best practice') || lower.includes('lỗi') || lower.includes('tối ưu') || lower.includes('kinh nghiệm')) {
        currentSection = 'practice';
      }

      if (currentSection === 'concept') conceptText += line + '\n';
      else if (currentSection === 'arch') archText += line + '\n';
      else practiceText += line + '\n';
    }

    if (!conceptText.trim()) conceptText = aiReply.slice(0, Math.floor(aiReply.length / 3));
    if (!archText.trim()) archText = aiReply.slice(Math.floor(aiReply.length / 3), Math.floor(aiReply.length * 2 / 3));
    if (!practiceText.trim()) practiceText = aiReply.slice(Math.floor(aiReply.length * 2 / 3));

    // 4. Khởi tạo Note 00: MOC (Map of Content / Sơ Đồ Tổng Quan)
    const mocContent = `---
title: "Sơ Đồ Tri Thức: ${topic}"
type: "moc"
topic: "${topic}"
category: "knowledge"
tags:
  - knowledge-graph
  - moc
  - ai-learned
created: "${todayStr}"
updated: "${todayStr}"
version: 1
status: "active"
related:
  - "[[${conceptPath.replace(/\.md$/, '')}|01. Khái Niệm & Nguyên Lý]]"
  - "[[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc & Triển Khai]]"
  - "[[${practicePath.replace(/\.md$/, '')}|03. Best Practices & Lưu Ý]]"
---

# 🗺️ Sơ Đồ Tri Thức: ${topic}

> **Chủ đề chính**: ${topic}  
> **Nguồn gốc học tập**: Hội thoại AI Karik Brain  
> **Ngày tạo**: ${todayStr} &bull; **Phiên bản**: v1.0  
> **Yêu cầu khởi tạo**: *"${prompt}"*

---

## 📌 1. Bản Đồ Phân Nhánh Tri Thức (Knowledge Sub-Nodes)

Dưới đây là các nhánh nghiên cứu chuyên sâu được AI tự động phân rã và liên kết:

1. **Khái Niệm Cốt Lõi**:
   👉 [[${conceptPath.replace(/\.md$/, '')}|01. Khái Niệm & Nguyên Lý ${topic}]]  
   *Định nghĩa, bản chất vận hành, nguồn gốc và lý do sử dụng.*

2. **Kiến Trúc & Hướng Dẫn Kỹ Thuật**:
   👉 [[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc & Triển Khai ${topic}]]  
   *Cấu trúc module, câu lệnh thực thi, code mẫu và các bước thiết lập.*

3. **Kinh Nghiệm & Best Practices**:
   👉 [[${practicePath.replace(/\.md$/, '')}|03. Best Practices & Lưu Ý ${topic}]]  
   *Những cạm bẫy thường gặp, kinh nghiệm thực chiến và phương pháp tối ưu hóa.*

---

## 💡 2. Tóm Tắt Khái Quát
${aiReply.slice(0, 350).trim()}...
${vaultLinksSection}

---
*Ghi chú này được tạo tự động bởi AI Karik Brain Knowledge Distillation Engine.*
`;

    // 5. Khởi tạo Note 01: Khái Niệm & Nguyên Lý
    const conceptContent = `---
title: "Khái Niệm & Nguyên Lý: ${topic}"
type: "concept"
topic: "${topic}"
tags:
  - concept
  - fundamentals
created: "${todayStr}"
updated: "${todayStr}"
version: 1
parent: "[[${mocPath.replace(/\.md$/, '')}|00. Sơ Đồ Tri Thức ${topic}]]"
related:
  - "[[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc & Triển Khai]]"
---

# 📖 Khái Niệm & Nguyên Lý: ${topic}

> **Thuộc sơ đồ**: [[${mocPath.replace(/\.md$/, '')}|00. Sơ Đồ Tri Thức ${topic}]]  
> **Tiếp theo**: [[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc & Triển Khai ${topic}]]

---

## 🎯 1. Bản Chất & Định Nghĩa
${conceptText.trim()}

---

## 🔗 Liên Kết Tri Thức
- [[${mocPath.replace(/\.md$/, '')}|Quay lại Sơ Đồ Tổng Quan (MOC)]]
- [[${archPath.replace(/\.md$/, '')}|Xem tiếp Hướng Dẫn & Triển Khai]]
`;

    // 6. Khởi tạo Note 02: Kiến Trúc & Triển Khai
    const archContent = `---
title: "Kiến Trúc & Triển Khai: ${topic}"
type: "architecture"
topic: "${topic}"
tags:
  - architecture
  - implementation
  - guide
created: "${todayStr}"
updated: "${todayStr}"
version: 1
parent: "[[${mocPath.replace(/\.md$/, '')}|00. Sơ Đồ Tri Thức ${topic}]]"
related:
  - "[[${conceptPath.replace(/\.md$/, '')}|01. Khái Niệm & Nguyên Lý]]"
  - "[[${practicePath.replace(/\.md$/, '')}|03. Best Practices & Lưu Ý]]"
---

# 🏛️ Kiến Trúc & Triển Khai: ${topic}

> **Thuộc sơ đồ**: [[${mocPath.replace(/\.md$/, '')}|00. Sơ Đồ Tri Thức ${topic}]]  
> **Khái niệm trước**: [[${conceptPath.replace(/\.md$/, '')}|01. Khái Niệm & Nguyên Lý ${topic}]]  
> **Kinh nghiệm tiếp theo**: [[${practicePath.replace(/\.md$/, '')}|03. Best Practices & Lưu Ý ${topic}]]

---

## ⚙️ Hướng Dẫn Thực Hành & Cấu Trúc Kỹ Thuật
${archText.trim()}

---

## 🔗 Liên Kết Tri Thức
- [[${conceptPath.replace(/\.md$/, '')}|Xem lại Khái Niệm Nền Tảng]]
- [[${practicePath.replace(/\.md$/, '')}|Xem Best Practices & Lỗi Thường Gặp]]
- [[${mocPath.replace(/\.md$/, '')}|Về Sơ Đồ Tổng Quan (MOC)]]
`;

    // 7. Khởi tạo Note 03: Best Practices & Lưu Ý
    const practiceContent = `---
title: "Best Practices & Lưu Ý: ${topic}"
type: "practices"
topic: "${topic}"
tags:
  - best-practices
  - optimization
  - pitfalls
created: "${todayStr}"
updated: "${todayStr}"
version: 1
parent: "[[${mocPath.replace(/\.md$/, '')}|00. Sơ Đồ Tri Thức ${topic}]]"
related:
  - "[[${conceptPath.replace(/\.md$/, '')}|01. Khái Niệm & Nguyên Lý]]"
  - "[[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc & Triển Khai]]"
---

# 🚀 Best Practices & Lưu Ý Thực Chiến: ${topic}

> **Thuộc sơ đồ**: [[${mocPath.replace(/\.md$/, '')}|00. Sơ Đồ Tri Thức ${topic}]]  
> **Kỹ thuật liên quan**: [[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc & Triển Khai ${topic}]]

---

## 💡 Kinh Nghiệm & Khắc Phục Lỗi
${practiceText.trim()}

---

## 🔗 Liên Kết Tri Thức
- [[${mocPath.replace(/\.md$/, '')}|Về Sơ Đồ Tổng Quan (MOC)]]
- [[${conceptPath.replace(/\.md$/, '')}|01. Khái Niệm]] &bull; [[${archPath.replace(/\.md$/, '')}|02. Kiến Trúc]]
`;

    // 8. Lưu tất cả các file vào Obsidian Vault (GitHub & Local) và Lập Chỉ Mục Vector
    const notesToSave = [
      { path: mocPath, content: mocContent, title: `Sơ Đồ Tri Thức ${topic}`, type: 'moc' },
      { path: conceptPath, content: conceptContent, title: `Khái Niệm ${topic}`, type: 'concept' },
      { path: archPath, content: archContent, title: `Kiến Trúc & Triển Khai ${topic}`, type: 'architecture' },
      { path: practicePath, content: practiceContent, title: `Best Practices ${topic}`, type: 'practices' }
    ];

    const savedNotes = [];
    for (const note of notesToSave) {
      const existing = await githubRepository.getFile(note.path);
      const res = await githubRepository.updateFile(
        note.path,
        note.content,
        `AI Learned Knowledge Graph: ${note.path}`,
        existing.sha
      );

      // Lập chỉ mục Vector RAG tức thì cho note
      await indexService.indexObsidianNote(note.path, note.content, {
        topic,
        title: note.title,
        type: note.type
      });

      savedNotes.push({
        path: note.path,
        title: note.title,
        type: note.type,
        sha: res.sha
      });
    }

    // 9. Cập nhật danh sách ghi chú vừa học
    const subChapters = savedNotes.filter(n => n.type !== 'moc').map(n => n.path);

    const learnedRecord = {
      topic,
      folder,
      mocPath,
      timestamp: new Date().toISOString(),
      prompt,
      notesCount: savedNotes.length,
      notes: savedNotes,
      chapters: subChapters
    };

    this.recentLearnedNotes.unshift(learnedRecord);
    if (this.recentLearnedNotes.length > this.MAX_RECENT) {
      this.recentLearnedNotes.pop();
    }

    return learnedRecord;
  }

  /**
   * Cải tiến & làm giàu (Refine & Enrich) ghi chú cũ khi có kiến thức mới
   */
  async refineExistingNotes(topic, prompt, aiReply) {
    const folder = `wiki/${topic}`;
    const mocPath = `${folder}/00. Sơ Đồ Tri Thức ${topic}.md`;
    const mocFile = await githubRepository.getFile(mocPath);

    if (!mocFile || !mocFile.content || mocFile.content.includes('File mới hoặc chưa tồn tại')) {
      // Nếu chưa có, tạo cụm note mới
      return await this.distillToAtomicNotes(topic, prompt, aiReply);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const oldContent = mocFile.content;

    // Trích xuất version cũ
    const versionMatch = oldContent.match(/version:\s*(\d+)/i);
    const currentVersion = versionMatch ? parseInt(versionMatch[1], 10) : 1;
    const newVersion = currentVersion + 1;

    // Cập nhật Frontmatter version & updated date
    let updatedContent = oldContent
      .replace(/updated:\s*"[^"]*"/i, `updated: "${todayStr}"`)
      .replace(/version:\s*\d+/i, `version: ${newVersion}`);

    // Bổ sung phần Cải tiến mới vào cuối note MOC
    const updateSection = `\n\n## 🔄 Cải Tiến & Bổ Sung Tri Thức Mới (v${newVersion}.0 - ${todayStr})\n` +
      `> **Yêu cầu bổ sung**: *"${prompt}"*\n\n` +
      `${aiReply.trim()}\n\n---\n*Ghi chú được cập nhật và làm giàu nội dung tự động bởi AI Karik Brain.*`;

    updatedContent += updateSection;

    // Lưu lại và cập nhật Vector
    const updateResult = await githubRepository.updateFile(
      mocPath,
      updatedContent,
      `AI Refined Knowledge Graph: ${mocPath} (v${newVersion})`,
      mocFile.sha
    );

    await indexService.indexObsidianNote(mocPath, updatedContent, {
      topic,
      title: `Sơ Đồ Tri Thức ${topic} (v${newVersion})`,
      type: 'moc',
      refined: true
    });

    return {
      topic,
      folder,
      mocPath,
      refined: true,
      version: newVersion,
      sha: updateResult.sha
    };
  }

  /**
   * Phương thức tổng điều phối xử lý hội thoại -> Tri thức Obsidian
   */
  async learnFromConversation({ prompt, reply, topic: customTopic, providerInstance, force = false }) {
    if (!force && !this.evaluateKnowledgeValue(prompt, reply)) {
      return { learned: false, reason: 'Nội dung chưa đủ tiêu chuẩn tri thức kỹ thuật cần lưu trữ.' };
    }

    const topic = customTopic || this.extractTopic(prompt, reply);
    const folder = `wiki/${topic}`;
    const mocPath = `${folder}/00. Sơ Đồ Tri Thức ${topic}.md`;

    // Kiểm tra xem đã có sơ đồ tri thức cho chủ đề này chưa
    const existingMoc = await githubRepository.getFile(mocPath);
    const isExisting = existingMoc && existingMoc.content && !existingMoc.content.includes('File mới hoặc chưa tồn tại');

    if (isExisting) {
      const refined = await this.refineExistingNotes(topic, prompt, reply);
      return { learned: true, action: 'refined', ...refined };
    } else {
      const created = await this.distillToAtomicNotes(topic, prompt, reply, providerInstance);
      return { learned: true, action: 'created', ...created };
    }
  }

  /**
   * Lấy danh sách các ghi chú vừa học gần nhất
   */
  getRecentLearnedNotes(limit = 10) {
    return this.recentLearnedNotes.slice(0, limit);
  }

  // Phương thức lưu ghi chú thô tương thích ngược
  async saveRawKnowledge(topic, prompt, aiReply) {
    const rawPath = `raw/${topic}.md`;
    const todayStr = new Date().toISOString().split('T')[0];
    const rawContent = `# 📝 Kiến Thức Thô - ${topic}\n\n> **Ngày khởi tạo**: ${todayStr}\n> **Yêu cầu ban đầu**: "${prompt}"\n\n---\n\n## 📌 Nội Dung Thu Thập\n\n${aiReply}\n\n---\n*Ghi chú này được tự động tạo và lưu tại thư mục raw/ của Obsidian Vault.*\n`;

    const existing = await githubRepository.getFile(rawPath);
    const result = await githubRepository.updateFile(
      rawPath,
      rawContent,
      `AI Auto-Save Raw Knowledge: ${rawPath}`,
      existing.sha
    );

    return { path: rawPath, topic, sha: result.sha };
  }

  // Phương thức digestToWiki tương thích ngược
  async digestToWiki(topic, prompt, aiReply, providerInstance) {
    return await this.distillToAtomicNotes(topic, prompt, aiReply, providerInstance);
  }
}

module.exports = new KnowledgePipelineService();
