# 🧠 AI Brain Prompts Catalog (100% Markdown)

Thư mục này chứa **toàn bộ các chỉ thị mẫu (Prompts) định dạng thuần Markdown (`.md`)** cho hệ thống **AI Karik Brain**.

> 📌 **Quy chuẩn thiết kế**:
> - Thư mục này **CHỈ chứa các file `.md`**, không chứa bất kỳ file `.js` nào.
> - Mỗi file `.md` đại diện cho một tác vụ hoặc vai trò cụ thể của AI, được viết đầy đủ, chi tiết và cấu trúc rõ ràng.
> - Logic đọc, bộ nhớ đệm (cache) và nạp biến động `{{variable}}` được quản lý tập trung tại Service tầng AI: [`src/services/ai/prompt.service.js`](../services/ai/prompt.service.js).

---

## 📂 Danh Sách Các File Prompts:

| Tên File | Vai Trò / Mục Đích | Biến Động (Variables) |
| :--- | :--- | :--- |
| [`system.prompt.md`](./system.prompt.md) | Định danh AI Karik, năng lực cốt lõi, phong cách giao tiếp và giới hạn an toàn | Tĩnh (Không biến) |
| [`image.prompt.md`](./image.prompt.md) | Chỉ thị Agent Studio Ảnh: Thiết kế concept, bảng màu, layers & studio biên tập ảnh | `{{topic}}`, `{{aspect_ratio}}` |
| [`social.prompt.md`](./social.prompt.md) | Chỉ thị Agent Đăng Bài MXH: Tạo Caption, Viral Hook & Tự động vào trình duyệt đăng Facebook/TikTok | `{{topic}}`, `{{platform}}` |
| [`risk.prompt.md`](./risk.prompt.md) | Chỉ thị Agent Rủi Ro & Tiến Độ: Phân tích chỉ số Ads (CTR, CPC, ROAS) & Ma trận rủi ro | `{{campaign}}`, `{{metrics}}` |
| [`coding.prompt.md`](./coding.prompt.md) | Chỉ thị Kỹ Sư Trưởng viết code sạch, refactor chuẩn Clean Architecture | `{{instruction}}`, `{{code}}` |
| [`review.prompt.md`](./review.prompt.md) | Chỉ thị Tech Lead & Security Auditor đánh giá chất lượng và bảo mật mã nguồn | `{{code}}` |
| [`wiki.prompt.md`](./wiki.prompt.md) | Chỉ thị Knowledge Architect tinh chế tri thức thành ghi chú Obsidian Wiki | `{{topic}}`, `{{context}}` |
| [`summary.prompt.md`](./summary.prompt.md) | Chỉ thị Executive Synthesizer tóm tắt tài liệu súc tích, lược bỏ thông tin thừa | `{{text}}` |
| [`rag.prompt.md`](./rag.prompt.md) | Chỉ thị RAG trả lời câu hỏi dựa trên ngữ cảnh trích xuất từ Vector DB | `{{context}}`, `{{query}}` |
| [`voice.prompt.md`](./voice.prompt.md) | Chỉ thị giọng nói tối ưu cho phản hồi Text-To-Speech (TTS) tự nhiên | `{{input}}` |

---

## ⚡ Cách Thức Sử Dụng Trong Node.js (Clean Architecture):

Tất cả các dịch vụ (Services, Providers) nạp prompt thông qua `prompt.service.js`:

```javascript
const promptService = require('../services/ai/prompt.service');

// 1. Lấy System Prompt tĩnh
const systemPrompt = promptService.getSystemPrompt();

// 2. Tạo Coding Prompt với biến động
const codePrompt = promptService.getCodingPrompt('Tối ưu hóa hàm', 'function example() {}');

// 3. Tạo Review Prompt
const reviewPrompt = promptService.getReviewPrompt('const a = 1;');

// 4. Tạo Wiki Distillation Prompt
const wikiPrompt = promptService.getWikiPrompt('Docker', 'Thông tin Docker...');

// 5. Tạo Summary Prompt
const summaryPrompt = promptService.getSummaryPrompt('Nội dung tài liệu dài...');

// 6. Generic Prompt Renderer (cho bất kỳ file .md nào trong thư mục prompts)
const customPrompt = promptService.renderPrompt('rag.prompt.md', {
  query: 'Supabase là gì?',
  context: 'Supabase là nền tảng Backend as a Service...'
});
```
