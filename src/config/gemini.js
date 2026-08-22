const env = require('./env');

module.exports = {
  apiKey: env.ai.geminiApiKey,
  defaultModel: 'gemini-3.5-flash-lite',
  fastModel: 'gemini-3.5-flash-lite',
  fallbackModels: ['gemini-flash-lite-latest', 'gemini-3.6-flash', 'gemini-2.5-flash-tts', 'gemini-3.1-flash-tts'],
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',

  // 🤖 AI Karik Multi-Agent Ecosystem Architecture
  agents: {
    orchestrator: {
      id: 'orchestrator',
      name: 'AI Karik',
      model: 'gemini-3.5-flash-lite',
      role: 'AI chính điều phối các Agent, tổng hợp kết quả và trả lời chuyên nghiệp',
      badge: 'AI Karik (Orchestrator)'
    },
    image: {
      id: 'image',
      name: 'Agent Làm Ảnh',
      model: 'gemini-3.1-flash-tts',
      role: 'Thiết kế concept hình ảnh quảng cáo, poster, banner, visual prompts',
      badge: 'Agent Làm Ảnh (gemini-3.1-flash-tts)'
    },
    video: {
      id: 'video',
      name: 'Agent Làm Clip',
      model: 'gemini-3.1-flash-tts',
      role: 'Lên kịch bản video ngắn TikTok/Reels, phân cảnh storyboard và hook 3s',
      badge: 'Agent Làm Clip (Gemini 3.1 Flash TTS)'
    },
    risk: {
      id: 'risk',
      name: 'Agent Quản Lý Rủi Ro & Tiến Độ',
      model: 'gemini-3.5-flash-lite',
      role: 'Đo lường chỉ số ads (CTR, CPC, ROAS), cảnh báo rủi ro & tiến độ',
      badge: 'Agent Rủi Ro & Tiến Độ (Gemini 3.5 Flash Lite)'
    }
  },

  // ⚡ Token-Based Execution Policy (No RPD limits)
  trackingMode: 'token', // Token-based tracking instead of RPD
  tpmRateLimit: 4000000 // 4M TPM Budget
};


