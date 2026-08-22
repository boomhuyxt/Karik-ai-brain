const geminiConfig = require('../../config/gemini');

class RouterService {
  isProviderAvailable(provider) {
    return provider === 'gemini' ? Boolean(geminiConfig.apiKey) : false;
  }

  getDefaultAvailableProvider() {
    return 'gemini';
  }

  selectProvider() {
    // Exclusively use Google Gemini as the core underlying provider
    return 'gemini';
  }

  /**
   * AI Karik Agent Dispatcher:
   * AI Karik is the primary orchestrator that delegates specialized tasks to dedicated sub-agents
   * @param {string} prompt - User prompt
   * @param {string} category - Optional category
   * @returns {{ id: string, name: string, model: string, role: string, badge: string }}
   */
  dispatchAgent(prompt = '', category = '') {
    const text = `${prompt} ${category}`.toLowerCase();

    // 1. Image Generation & Visual Concept Agent (Gemini 3.5 Flash Lite)
    const imageKeywords = [
      'tạo ảnh', 'vẽ ảnh', 'hình ảnh', 'tạo hình', 'poster', 'banner',
      'concept art', 'midjourney', 'dall-e', 'stable diffusion', 'visual',
      'ảnh quảng cáo', 'thiết kế ảnh', 'prompts ảnh', 'prompt ảnh', 'vẽ cho'
    ];
    if (imageKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.image;
    }

    // 2. Short Video / Clip Scripting Agent (Gemini 3.6 Flash)
    const videoKeywords = [
      'clip', 'video', 'kịch bản', 'tiktok', 'reels', 'shorts',
      'clip ngắn', 'video ngắn', 'storyboard', 'hook 3s', 'quay video',
      'quay clip', 'dựng clip', 'kịch bản video', 'kịch bản clip'
    ];
    if (videoKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.video;
    }

    // 3. Ad Project Progress & Risk Management Agent (Gemini 3.5 Flash Lite)
    const riskKeywords = [
      'rủi ro', 'tiến độ', 'quảng cáo', 'dự án quảng cáo', 'chiến dịch',
      'ads', 'campaign', 'cpc', 'ctr', 'roas', 'cpa', 'ngân sách',
      'độ rủi ro', 'kiểm tra tiến độ', 'bão hòa quảng cáo', 'lead ads'
    ];
    if (riskKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.risk;
    }

    // 4. Default: AI Karik Main Orchestrator (Gemini 3.5 Flash Lite)
    return geminiConfig.agents.orchestrator;
  }

  /**
   * AI Karik Prompt Engineering & Task Analysis Engine:
   * AI Karik receives the raw user request, analyzes intent & requirements,
   * and crafts an enriched, structured, production-ready prompt for the assigned Agent.
   * @param {string} prompt - Raw user prompt
   * @param {{ id: string, name: string, model: string }} agent - Assigned Agent
   * @param {string} context - Optional RAG context
   * @returns {string} Enriched prompt
   */
  buildOrchestratedPrompt(prompt = '', agent = null, context = '') {
    if (!agent || agent.id === 'orchestrator') {
      return prompt;
    }

    if (agent.id === 'image') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT LÀM ẢNH (Model: ${agent.model})]:
- Mục tiêu: Phân tích yêu cầu và thiết kế bộ Concept Visual + Prompt tiếng Anh chuyên sâu cho công cụ AI tạo ảnh.
- Yêu cầu ban đầu của người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. Phân tích chi tiết Concept & Bố cục Visual (Phong cách, ánh sáng, góc máy, bảng màu).
  2. Viết Prompt tiếng Anh chuẩn Midjourney v6/DALL-E 3/SDXL (kèm tham số kỹ thuật --ar, --v 6.0, 8k, photorealistic).
  3. Tự động chèn ảnh xem trước trực quan qua Pollinations AI: ![Concept Visual](https://image.pollinations.ai/prompt/<encode_tiếng_anh_prompt>?width=1024&height=576&nologo=true).
  4. Tuân thủ nghiêm ngặt quy chuẩn tại image.prompt.md.`;
    }

    if (agent.id === 'video') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT LÀM CLIP (Model: ${agent.model})]:
- Mục tiêu: Biên kịch video ngắn triệu view và xây dựng kịch bản chi tiết cho TikTok/Reels/Shorts.
- Yêu cầu ban đầu của người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. Xây dựng Hook 3 giây đầu giữ chân người xem (Visual + Voiceover + SFX).
  2. Lập Bảng phân cảnh Storyboard 5 cột chi tiết (Phân cảnh | Thời lượng | Góc quay & Visual | Lời thoại Voiceover | Âm thanh SFX/BGM).
  3. Lời kêu gọi hành động (CTA) đẩy cao tỷ lệ chuyển đổi.
  4. Cung cấp Prompt cho AI Video Generator (Runway Gen-3/Sora/Pika/Kling).
  5. Tuân thủ nghiêm ngặt quy chuẩn tại video.prompt.md.`;
    }

    if (agent.id === 'risk') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT RỦI RO & TIẾN ĐỘ (Model: ${agent.model})]:
- Mục tiêu: Thẩm định chỉ số hiệu suất quảng cáo, tính điểm ma trận rủi ro và đề xuất checklist tối ưu.
- Dữ liệu chiến dịch / Yêu cầu người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. Đánh giá bộ chỉ số KPIs (CTR, CPC, CPA, ROAS, Tần suất).
  2. Tính điểm ma trận rủi ro (Cảnh báo bão hòa quảng cáo, vượt ngân sách).
  3. Đưa ra checklist tối ưu ngân sách và kế hoạch mở rộng an toàn.
  4. Tuân thủ nghiêm ngặt quy chuẩn tại risk.prompt.md.`;
    }

    return prompt;
  }
}

module.exports = new RouterService();
