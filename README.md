# AI Brain Karik - Node.js Architecture (Clean Architecture + Modules)

A complete Node.js backend system for **AI Brain Karik**, designed using Clean Architecture & Module Pattern.

## 🌐 Live Domain

- 🔗 **Production URL**: [https://www.karik.io.vn](https://www.karik.io.vn)
- 🟢 **Status**: Online / Active

## Directory Structure

```text
ai-brain/
├── src/
│   ├── config/          # GitHub, Supabase, AI Providers configuration
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

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start

# Run unit & integration tests
npm test
```

## Key Features

- 🤖 **AI Multi-Model Router**: Intelligent and automatic routing of requests to the most optimal AI provider (Coding -> ChatGPT, Research -> Gemini, Ultra-fast -> Groq, Complex Analysis -> Claude, Reasoning -> TokenRouter/DeepSeek, Multi-model -> OpenRouter).
- 🎨 **Image Generation Suite**: Integrated with multiple image providers including Cloudflare Workers AI (Flux 2), Gemini Image, Pollinations (Free), and Stable Diffusion (Local SD WebUI).
- 📚 **RAG System & Knowledge Base**: Extraction of Markdown note data from GitHub Private Repo -> Pre-processing (Chunking) -> Vector Embedding -> Semantic search & storage via Supabase (pgvector).
- 🔄 **Obsidian Vault Sync**: Automated two-way note synchronization from personal Obsidian Vault via GitHub Webhooks and scheduled cron jobs.
- 🗣️ **Voice (TTS) & Mail Services**: Text-to-Speech integration for vivid voice generation and automated email notification system via SMTP (Gmail).
- 📊 **Token & Cost Analytics**: Real-time tracking of token usage, system performance monitoring, and automatic cost estimation per AI model.
- 🧠 **Memory System & Project Management**: Long-term context persistence, project management, Social media posts, and workflow automation support.

## AI API Key Configuration

The system manages all API Keys through an **environment configuration file `.env`** located in the **project root directory** (`ai-brain/.env`). When the application starts, [src/config/env.js](file:///c:/Users/boomh/OneDrive/Documents/Karik-ai-brain/src/config/env.js) automatically loads these keys.

### 1. File Location & Setup

- **File Path**: `ai-brain/.env` (Located directly in the root directory of the project, alongside `package.json` and `server.js`).
- **Creating the file**: If `.env` does not exist yet, create a new one or copy from the template `.env.example`:

```bash
# On Linux / macOS
cp .env.example .env

# On Windows PowerShell
copy .env.example .env
```

---

### 2. Specific Sections in `.env`

Open `.env` in your code editor (VS Code / Antigravity IDE / Notepad). You will find clearly defined sections for adding your API Keys:

#### 📍 Section 1: `# AI Providers API Keys` (Main AI Models)
Insert your API Key right after the `=` sign for each variable:
```env
# AI Providers API Keys
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_IMAGE_API_KEY=your_gemini_image_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GROQ_API_KEY=your_groq_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

#### 📍 Section 2: `# Cloudflare Workers AI Config` (Flux 2 Image Generation)
```env
# Cloudflare Workers AI Config
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-2-klein-9b
```

#### 📍 Section 3: `# TokenRouter Config (DeepSeek / Reasoning)` (Reasoning Models)
```env
# TokenRouter Config (DeepSeek / Reasoning)
TOKENROUTER_API_KEY=your_tokenrouter_api_key_here
TOKENROUTER_BASE_URL=https://api.tokenrouter.com/v1
```

---

### 3. Environment Variables & API Key Sources

| Environment Variable in `.env` | AI Provider Name | Where to Register & Get API Key |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_IMAGE_API_KEY` | Gemini Image | [Google AI Studio](https://aistudio.google.com/) (Optional, defaults to `GEMINI_API_KEY`) |
| `OPENAI_API_KEY` | OpenAI (ChatGPT) | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `CLAUDE_API_KEY` | Anthropic Claude | [Anthropic Console](https://console.anthropic.com/) |
| `GROQ_API_KEY` | Groq (Llama 3 / Mixtral) | [Groq Cloud Console](https://console.groq.com/keys) |
| `OPENROUTER_API_KEY` | OpenRouter | [OpenRouter](https://openrouter.ai/keys) |
| `TOKENROUTER_API_KEY` | TokenRouter (DeepSeek) | [TokenRouter](https://tokenrouter.ai/) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers AI | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account | Obtain from Cloudflare Dashboard Homepage |

---

### 4. Step-by-Step Instructions

1. **Open the `.env` file** located in the root directory of the project.
2. **Navigate to the target section** (e.g., `# AI Providers API Keys`).
3. **Replace the placeholder value** (e.g., `your_gemini_api_key_here`) with your **actual API Key** obtained from the provider.
4. **Save the `.env` file** (`Ctrl + S`).
5. **Start the application** (`npm run dev`) - The system will automatically load the API Keys from `.env` via [src/config/env.js](file:///c:/Users/boomh/OneDrive/Documents/Karik-ai-brain/src/config/env.js).

> 💡 **Note**: You do not need to fill in every API Key. The **AI Multi-Model Router** system will automatically check which keys are available in `.env` and route requests to the corresponding AI providers.
