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

Hệ thống quản lý toàn bộ API Key thông qua **file cấu hình môi trường `.env`** đặt tại **thư mục gốc dự án** (`ai-brain/.env`). Khi ứng dụng khởi chạy, file [src/config/env.js](Karik-ai-brain/src/config/env.js) sẽ tự động nạp các API Key từ file này.

### 1. Nơi điền API Key (File & Thư mục)

- **Đường dẫn file**: `ai-brain/.env` (Nằm ngay tại thư mục gốc của dự án, cùng cấp với `package.json` và `server.js`).
- **Cách tạo file**: Nếu chưa có file `.env`, hãy tạo mới hoặc sao chép từ mẫu `.env.example`:

```bash
# Trên Linux / macOS
cp .env.example .env

# Trên Windows PowerShell
copy .env.example .env
```

---

### 2. Vị trí cụ thể từng mục trong file `.env`

Mở file `.env` bằng trình biên soạn mã (VS Code / Antigravity IDE / Notepad), bạn sẽ thấy các mục được phân chia rõ ràng để điền API Key:

#### 📍 Mục 1: `# AI Providers API Keys` (Cấu hình các AI Model chính)
Điền API Key của bạn ngay sau dấu `=` cho từng biến:
```env
# AI Providers API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_IMAGE_API_KEY=your_gemini_image_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GROQ_API_KEY=your_groq_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

#### 📍 Mục 2: `# Cloudflare Workers AI Config` (Cấu hình tạo ảnh Flux 2)
```env
# Cloudflare Workers AI Config
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-9b
```

#### 📍 Mục 3: `# TokenRouter Config (DeepSeek / Reasoning)` (Model suy luận)
```env
# TokenRouter Config (DeepSeek / Reasoning)
TOKENROUTER_API_KEY=your_tokenrouter_api_key_here
TOKENROUTER_BASE_URL=https://api.tokenrouter.com/v1
```

---

### 3. Bảng chi tiết biến môi trường & Nơi lấy API Key

| Biến môi trường trong `.env` | Tên nhà cung cấp AI | Nơi đăng ký & Lấy API Key |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_IMAGE_API_KEY` | Gemini Image | [Google AI Studio](https://aistudio.google.com/) (Tùy chọn, mặc định dùng `GEMINI_API_KEY`) |
| `OPENAI_API_KEY` | OpenAI (ChatGPT) | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `CLAUDE_API_KEY` | Anthropic Claude | [Anthropic Console](https://console.anthropic.com/) |
| `GROQ_API_KEY` | Groq (Llama 3 / Mixtral) | [Groq Cloud Console](https://console.groq.com/keys) |
| `OPENROUTER_API_KEY` | OpenRouter | [OpenRouter](https://openrouter.ai/keys) |
| `TOKENROUTER_API_KEY` | TokenRouter (DeepSeek) | [TokenRouter](https://tokenrouter.ai/) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers AI | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account | Lấy tại trang chủ Dashboard Cloudflare |

---

### 4. Hướng dẫn các bước thực hiện chi tiết

1. **Mở file `.env`** đặt ở thư mục gốc của dự án.
2. **Tìm đến nhóm cấu hình tương ứng** (Ví dụ: nhóm `# AI Providers API Keys`).
3. **Thay thế giá trị mẫu** (ví dụ: `your_gemini_api_key_here`) bằng **API Key thật** thu được từ nhà cung cấp dịch vụ.
4. **Lưu file `.env`** (`Ctrl + S`).
5. **Khởi chạy ứng dụng** (`npm run dev`) - Hệ thống sẽ tự động nạp các API Key từ file `.env` qua [src/config/env.js](file:///c:/Users/boomh/OneDrive/Documents/Karik-ai-brain/src/config/env.js).

> 💡 **Lưu ý**: Bạn không cần điền tất cả các API Key. Hệ thống **AI Multi-Model Router** sẽ tự động kiểm tra key nào khả dụng trong file `.env` để phân luồng yêu cầu tới AI provider tương ứng.


