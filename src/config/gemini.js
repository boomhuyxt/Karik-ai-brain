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
      name: 'Agent Studio Ảnh (Gemini 3.6 Flash)',
      model: 'gemini-3.6-flash',
      role: 'Chuyên gia thiết kế & biên tập hình ảnh, poster, banner qua AI Karik Studio (Bố cục, Typography, Layer, Filter, Xóa nền)',
      badge: 'Agent Studio Ảnh (Gemini 3.6 Flash)'
    },
    social: {
      id: 'social',
      name: 'Agent Tự Động Đăng Bài MXH (Gemini 3.1 Flash Lite)',
      model: 'gemini-3.1-flash-lite',
      role: 'Tự động tạo nội dung Caption, Viral Hook & Đăng bài tự động lên Facebook và TikTok qua API không cần dán tay',
      badge: 'Agent Tự Động Đăng Bài (Gemini 3.1 Flash Lite)'
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


