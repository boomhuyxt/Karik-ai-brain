# AI Brain OS - Node.js Architecture (Clean Architecture + Modules)

Hệ thống backend Node.js hoàn chỉnh cho **AI Brain OS**, thiết kế theo Clean Architecture & Module Pattern.

## Kiến trúc thư mục

```text
ai-brain/
├── src/
│   ├── config/          # GitHub, Supabase, AI Providers config
│   ├── routes/          # REST API Routes
│   ├── controllers/     # Controller handlers
│   ├── services/        # AI Manager, Router, RAG, Obsidian, GitHub, Dashboard logic
│   ├── repositories/    # Database & External Data Repositories
│   ├── providers/       # Gemini, ChatGPT, Groq, OpenRouter, Claude SDK adapters
│   ├── middlewares/     # Auth, Logger, RateLimit, CORS, Error Handling
│   ├── validations/     # Request Validation schemas
│   ├── utils/           # Logger, Markdown, Tokenizer, YAML, Crypto helpers
│   ├── prompts/         # Centralized Prompt Management
│   ├── jobs/            # Background Jobs (GitHub sync, Embedding, Analytics)
│   ├── storage/         # Local Cache & Temp Storage
│   └── tests/           # Unit & Integration Tests
├── app.js               # Express application initialization
├── server.js            # Entry point & listener
├── package.json
└── README.md
```

## Chạy ứng dụng

```bash
# Cài đặt dependencies
npm install

# Khởi chạy ở chế độ phát triển
npm run dev

# Khởi chạy ở chế độ sản xuất
npm start

# Trình kiểm thử
npm test
```

## Chức năng nổi bật

- 🤖 **AI Multi-Model Router**: Tự động phân luồng yêu cầu thông minh tới các nhà cung cấp AI tối ưu nhất (Coding -> ChatGPT, Research -> Gemini, Ultra-fast -> Groq, Complex Analysis -> Claude, Reasoning -> TokenRouter/DeepSeek, Multi-model -> OpenRouter).
- 🎨 **Đa dạng AI Tạo ảnh (Image Generation)**: Tích hợp nhiều provider tạo ảnh mạnh mẽ bao gồm Cloudflare Workers AI (Flux 2), Gemini Image, Pollinations (Free) và Stable Diffusion (Local SD WebUI).
- 📚 **Hệ thống RAG System & Tri thức**: Trích xuất dữ liệu ghi chú Markdown từ GitHub Private Repo -> Tiền xử lý (Chunking) -> Tạo Vector Embedding -> Lưu trữ & Tìm kiếm ngữ nghĩa qua Supabase (pgvector).
- 🔄 **Đồng bộ Vault Obsidian**: Tự động đồng bộ hai chiều dữ liệu ghi chú từ Obsidian Vault cá nhân thông qua GitHub Webhook và Job chạy tự động định kỳ.
- 🗣️ **Dịch vụ Voice (TTS) & Mail**: Tích hợp Text-to-Speech chuyển đổi văn bản sang giọng nói sinh động và hệ thống gửi Email thông báo tự động qua SMTP (Gmail).
- 📊 **Thống kê Token & Chi phí**: Giám sát thời gian thực số lượng token đã tiêu thụ, theo dõi hiệu năng hệ thống và tự động ước tính chi phí cho từng model AI.
- 🧠 **Quản lý Bộ nhớ (Memory System) & Dự án**: Lưu trữ bối cảnh dài hạn, quản lý dự án, bài viết Social và hỗ trợ quy trình công việc (Workflow) tự động hóa.

## Cấu hình API Key AI

Hệ thống hỗ trợ nhiều nhà cung cấp AI khác nhau. Bạn có thể cấu hình API Key thông qua file `.env` ở thư mục gốc của dự án.

### 1. Tạo file cấu hình `.env`

Sao chép từ file mẫu `.env.example` hoặc tạo mới file `.env`:

```bash
# Trên Linux/macOS
cp .env.example .env

# Trên Windows PowerShell
copy .env.example .env
```

### 2. Danh sách biến môi trường AI API Keys

Mở file `.env` và điền các API Key tương ứng với nhà cung cấp bạn muốn sử dụng:

| Biến môi trường | Nhà cung cấp AI | Mô tả & Nơi lấy API Key |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | API Key chính cho Gemini Chat & Embeddings. Lấy tại: [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_IMAGE_API_KEY` | Gemini Image | API Key dùng riêng cho sinh ảnh với Gemini (Tùy chọn, mặc định dùng `GEMINI_API_KEY`) |
| `OPENAI_API_KEY` | OpenAI | Dùng cho GPT-4o, GPT-3.5 và coding execution. Lấy tại: [OpenAI Platform](https://platform.openai.com/) |
| `CLAUDE_API_KEY` | Anthropic Claude | Dùng cho Claude 3.5 Sonnet / Opus. Lấy tại: [Anthropic Console](https://console.anthropic.com/) |
| `GROQ_API_KEY` | Groq | Phân luồng cho suy luận siêu tốc (Llama 3, Mixtral). Lấy tại: [Groq Cloud Console](https://console.groq.com/) |
| `OPENROUTER_API_KEY` | OpenRouter | Truy cập hàng trăm model open-source và proprietary. Lấy tại: [OpenRouter](https://openrouter.ai/) |
| `TOKENROUTER_API_KEY` | TokenRouter | Hỗ trợ các dòng model suy luận chuyên sâu (DeepSeek/Reasoning). Lấy tại: [TokenRouter](https://tokenrouter.ai/) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare AI | API Token sinh ảnh Flux 2 qua Cloudflare Workers AI. Lấy tại: [Cloudflare Dashboard](https://dash.cloudflare.com/) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare AI | Account ID tài khoản Cloudflare |

### 3. Hướng dẫn chi tiết từng bước

1. **Google Gemini (Khuyên dùng)**:
   - Truy cập [Google AI Studio](https://aistudio.google.com/).
   - Tạo **API Key** mới và dán vào `GEMINI_API_KEY=your_gemini_key_here`.
2. **OpenAI / ChatGPT**:
   - Truy cập [OpenAI API Keys](https://platform.openai.com/api-keys).
   - Nạp credit và tạo key mới, dán vào `OPENAI_API_KEY=sk-...`.
3. **Groq (Miễn phí & Siêu nhanh)**:
   - Truy cập [Groq Cloud](https://console.groq.com/keys).
   - Tạo key miễn phí và dán vào `GROQ_API_KEY=gsk_...`.
4. **Anthropic Claude**:
   - Truy cập [Anthropic Console](https://console.anthropic.com/settings/keys).
   - Tạo key và dán vào `CLAUDE_API_KEY=sk-ant-...`.
5. **Cloudflare Workers AI (Flux 2 Image)**:
   - Tạo **API Token** có quyền read/write Workers AI trong Cloudflare Dashboard.
   - Điền `CLOUDFLARE_ACCOUNT_ID` và `CLOUDFLARE_API_TOKEN`.

> **Lưu ý**: Bạn không bắt buộc phải điền tất cả các API Key. Hệ thống **AI Multi-Model Router** sẽ tự động nhận biết provider nào có API Key khả dụng để điều hướng yêu cầu tương ứng.

