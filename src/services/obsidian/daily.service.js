const githubRepository = require('../../repositories/github.repository');

class DailyService {
  getTodayPath(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `Daily/${year}-${month}-${day}.md`;
  }

  generateDailyTemplate(dateStr) {
    return `# 📅 Daily Journal - ${dateStr}

## 📌 Focus & Mục Tiêu Hôm Nay
- [ ] Hoàn thiện các công việc ưu tiên hàng đầu.
- [ ] Ghi lại tiến độ và kết quả trên GitHub Brain OS.

## 📝 Nhật Ký Công Việc
- **09:00**: Bắt đầu công việc ngày mới.
- **14:00**: Tiến hành kiểm thử và đồng bộ dữ liệu.

## ✅ Việc Đã Hoàn Thành
- [x] Khởi tạo Daily note cho ngày ${dateStr}.

## 💡 Ghi Chú & Ý Tưởng Mới
- Kết nối thông tin với [[Wiki/AI Architecture]] và [[Projects/Graph Dashboard]].
`;
  }

  async getTodayDailyNote() {
    const todayStr = new Date().toISOString().split('T')[0];
    const path = this.getTodayPath();
    const file = await githubRepository.getFile(path);

    if (!file || !file.sha || file.content.includes('File mới hoặc chưa tồn tại')) {
      const template = this.generateDailyTemplate(todayStr);
      return {
        path,
        date: todayStr,
        content: template,
        sha: null,
        isNew: true
      };
    }

    return {
      path,
      date: todayStr,
      content: file.content,
      sha: file.sha,
      isNew: false
    };
  }

  async saveDailyNote(path, content, sha) {
    const targetPath = path || this.getTodayPath();
    const commitMsg = `Daily journal update: ${targetPath}`;
    return await githubRepository.updateFile(targetPath, content, commitMsg, sha);
  }
}

module.exports = new DailyService();
