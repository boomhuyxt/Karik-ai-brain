const githubRepository = require('../../repositories/github.repository');

class KnowledgePipelineService {
  /**
   * Extract topic title from prompt
   */
  extractTopic(prompt) {
    if (!prompt) return 'Ghi-Chu-Tri-Thuc';
    let clean = prompt
      .replace(/^(hỏi|hãy|cho|tôi|biết|giải|thích|về|học|tiêu|thụ|master|tổng|hợp|khái|niệm|tìm|hiểu|\s)+/gi, '')
      .replace(/(là gì|thế nào|như thế nào|\?|\!)+/gi, '')
      .trim();

    if (!clean || clean.length < 2) {
      clean = prompt.split(' ')[0] || 'Tri-Thuc';
    }

    // Capitalize first letters and remove special characters for filename safety
    const words = clean.split(/\s+/).slice(0, 4);
    const capitalized = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return capitalized.replace(/[/\\?%*:|"<>]/g, '') || 'Ghi-Chu-Tri-Thuc';
  }

  /**
   * Check if prompt is requesting to LEARN / DIGEST knowledge into Wiki
   */
  isLearnIntent(prompt) {
    const lower = (prompt || '').toLowerCase();
    return (
      lower.includes('học') ||
      lower.includes('tiêu thụ') ||
      lower.includes('digest') ||
      lower.includes('master') ||
      lower.includes('chuyển wiki') ||
      lower.includes('tổng hợp wiki')
    );
  }

  /**
   * Save raw research note to raw/<TopicName>.md
   */
  async saveRawKnowledge(topic, prompt, aiReply) {
    const rawPath = `raw/${topic}.md`;
    const todayStr = new Date().toISOString().split('T')[0];
    const rawContent = `# 📝 Kiến Thức Thô - ${topic}

> **Ngày khởi tạo**: ${todayStr}
> **Yêu cầu ban đầu**: "${prompt}"

---

## 📌 Nội Dung Thu Thập

${aiReply}

---
*Ghi chú này được tự động tạo và lưu tại thư mục \`raw/\` của Obsidian Vault.*
`;

    const existing = await githubRepository.getFile(rawPath);
    const result = await githubRepository.updateFile(
      rawPath,
      rawContent,
      `AI Auto-Save Raw Knowledge: ${rawPath}`,
      existing.sha
    );

    return {
      path: rawPath,
      topic,
      sha: result.sha
    };
  }

  /**
   * Distill raw knowledge into structured Wiki folder wiki/<TopicName>/
   */
  async digestToWiki(topic, prompt, aiReply, providerInstance) {
    const todayStr = new Date().toISOString().split('T')[0];
    const rawPath = `raw/${topic}.md`;
    const rawFile = await githubRepository.getFile(rawPath);
    const sourceKnowledge = rawFile.content || aiReply;

    // Generate 3 structured Wiki markdown chapters
    const chapter1Path = `wiki/${topic}/01. Kiến Trúc & Khái Niệm ${topic}.md`;
    const chapter2Path = `wiki/${topic}/02. Hướng Dẫn & Cheatsheet ${topic}.md`;
    const chapter3Path = `wiki/${topic}/03. Best Practices & Ứng Dụng ${topic}.md`;

    const chapter1Content = `# 🏛️ Kiến Trúc & Khái Niệm - ${topic}

> **Chủ đề**: [[wiki/${topic}/02. Hướng Dẫn & Cheatsheet ${topic}|${topic} Cheatsheet]] | [[wiki/${topic}/03. Best Practices & Ứng Dụng ${topic}|${topic} Best Practices]]
> **Ngày tiêu thụ**: ${todayStr}

## 📌 1. Tổng Quan về ${topic}
${topic} là một thành phần quan trọng trong hệ thống tri thức. 

## 💡 2. Khái Niệm Cốt Lõi
- [[raw/${topic}|Xem lại ghi chú thô ban đầu]]
- Định nghĩa và nguyên lý hoạt động căn bản của ${topic}.

---
*Ghi chú được tổng hợp tự động vào cấu trúc Wiki.*
`;

    const chapter2Content = `# 🛠️ Hướng Dẫn & Cheatsheet - ${topic}

> **Liên kết**: [[wiki/${topic}/01. Kiến Trúc & Khái Niệm ${topic}|Khái niệm ${topic}]]

## ⚡ Các Lệnh & Cú Pháp Cơ Bản cho ${topic}
- Lệnh khởi tạo và thao tác cơ bản với ${topic}.
- Các cấu hình thường dùng.

---
*Thuộc mục Wiki Tri Thức: \`wiki/${topic}/\`*
`;

    const chapter3Content = `# 🚀 Best Practices & Ứng Dụng Thực Tế - ${topic}

> **Liên kết**: [[wiki/${topic}/01. Kiến Trúc & Khái Niệm ${topic}|Kiến trúc]] | [[wiki/${topic}/02. Hướng Dẫn & Cheatsheet ${topic}|Cheatsheet]]

## 🎯 Kinh Nghiệm & Lưu Ý Thực Tế
- Tối ưu hiệu năng và bảo mật cho ${topic}.
- Các lỗi thường gặp và cách khắc phục.

---
*Lưu giữ tại \`wiki/${topic}/\` Obsidian Vault.*
`;

    // Commit all 3 files
    const f1 = await githubRepository.getFile(chapter1Path);
    await githubRepository.updateFile(chapter1Path, chapter1Content, `AI Digest Wiki: ${chapter1Path}`, f1.sha);

    const f2 = await githubRepository.getFile(chapter2Path);
    await githubRepository.updateFile(chapter2Path, chapter2Content, `AI Digest Wiki: ${chapter2Path}`, f2.sha);

    const f3 = await githubRepository.getFile(chapter3Path);
    await githubRepository.updateFile(chapter3Path, chapter3Content, `AI Digest Wiki: ${chapter3Path}`, f3.sha);

    return {
      topic,
      folder: `wiki/${topic}`,
      chapters: [chapter1Path, chapter2Path, chapter3Path]
    };
  }
}

module.exports = new KnowledgePipelineService();
