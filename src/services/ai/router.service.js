const geminiConfig = require('../../config/gemini');

class RouterService {
  isProviderAvailable(provider) {
    if (provider === 'gemini') return Boolean(geminiConfig.apiKey);
    return false;
  }

  getDefaultAvailableProvider() {
    return 'gemini';
  }

  /**
   * Phân luồng Provider (OpenAI, Gemini, Groq, DeepSeek, Claude, Gemini-Image)
   */
  selectProvider(prompt = '', category = '') {
    const lower = (prompt + ' ' + category).toLowerCase();

    if (lower.includes('tạo ảnh') || lower.includes('vẽ ảnh') || lower.includes('tao anh') || lower.includes('ve anh') || lower.includes('vẽ') || lower.includes('image') || lower.includes('imagen') || lower.includes('picture') || lower.includes('draw')) {
      return 'gemini-image';
    }
    if (lower.includes('code') || lower.includes('lap trinh') || lower.includes('function') || lower.includes('bug')) {
      return 'openai';
    }
    if (lower.includes('nghien cuu') || lower.includes('research') || lower.includes('tim hieu') || lower.includes('wiki')) {
      return 'gemini';
    }
    if (lower.includes('nhanh') || lower.includes('fast') || lower.includes('tom tat') || lower.includes('quick')) {
      return 'groq';
    }
    if (lower.includes('deepseek') || lower.includes('tokenrouter') || lower.includes('r1') || lower.includes('suy luan') || lower.includes('reasoning')) {
      return 'deepseek';
    }
    if (lower.includes('phan tich') || lower.includes('long') || lower.includes('sau') || lower.includes('analysis')) {
      return 'claude';
    }

    return 'gemini'; // Default AI provider
  }

  /**
   * AI Karik Agent Dispatcher:
   * AI Karik là orchestrator chính điều phối các tác vụ chuyên biệt cho các sub-agents
   * @param {string} prompt - User prompt
   * @param {string} category - Optional category
   * @returns {{ id: string, name: string, model: string, role: string, badge: string }}
   */
  dispatchAgent(prompt = '', category = '') {
    const text = `${prompt} ${category}`.toLowerCase();

    // 1. Image & Poster Studio Design Agent (Gemini 3.6 Flash)
    const imageKeywords = [
      'tạo ảnh', 'vẽ ảnh', 'hình ảnh', 'tạo hình', 'poster', 'banner',
      'concept art', 'visual', 'ảnh quảng cáo', 'thiết kế ảnh', 'prompts ảnh',
      'prompt ảnh', 'vẽ cho', 'edit ảnh', 'chỉnh sửa ảnh', 'chỉnh ảnh', 'studio ảnh',
      'xóa nền', 'tách nền', 'thay nền', 'ghép ảnh', 'layer ảnh', 'cắt ảnh', 'crop ảnh',
      'xoay ảnh', 'làm mờ', 'làm nét', 'filter ảnh', 'đổi màu ảnh'
    ];
    if (imageKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.image;
    }

    // 2. Social Media Publishing & Viral Copywriting Agent (Gemini 3.1 Flash)
    const socialKeywords = [
      'đăng bài', 'xuất bản', 'post bài', 'facebook', 'tiktok', 'bài đăng',
      'caption', 'viết bài facebook', 'viết bài tiktok', 'đăng fb', 'đăng tiktok',
      'viral post', 'status', 'content mxh', 'social publish', 'quảng cáo bài viết',
      'clip', 'video', 'kịch bản', 'reels', 'shorts', 'hook 3s', 'tiktok studio'
    ];
    if (socialKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.social;
    }

    // 3. Ad Project Progress & Risk Management Agent
    const riskKeywords = [
      'rủi ro', 'tiến độ', 'quảng cáo', 'dự án quảng cáo', 'chiến dịch',
      'ads', 'campaign', 'cpc', 'ctr', 'roas', 'cpa', 'ngân sách',
      'độ rủi ro', 'kiểm tra tiến độ', 'bão hòa quảng cáo', 'lead ads'
    ];
    if (riskKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.risk;
    }

    // 4. Mặc định: AI Karik Main Orchestrator
    return geminiConfig.agents.orchestrator;
  }

  /**
   * AI Karik Prompt Engineering & Task Analysis Engine
   */
  buildOrchestratedPrompt(prompt = '', agent = null, context = '') {
    if (!agent || agent.id === 'orchestrator') {
      return prompt;
    }

    if (agent.id === 'image') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT STUDIO ẢNH & POSTER DESIGNER (Model: ${agent.model})]:
- Mục tiêu: Phân tích yêu cầu và thiết kế bộ Concept Visual, bảng màu, typography và cấu trúc Layers chi tiết cho AI Karik Studio.
- Yêu cầu ban đầu của người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. Phân tích Concept & Bố cục Visual (Mục tiêu, phong cách, tỷ lệ Canvas khuyến nghị: Poster 4:5, Instagram 1:1, Story 9:16, Banner 16:9).
  2. Xây dựng Bảng màu (Color Palette với mã HEX) và Phông chữ đề xuất (Sora, Inter, Playfair Display, Montserrat, Oswald, Lobster...).
  3. Lập Bảng phân lớp thiết kế (Layer Specifications: Nền, Hình ảnh, Typography H1/H2/Body, Shapes/Huy hiệu, Hiệu ứng Filters, Tách nền Magic Cut).
  4. Hướng dẫn người dùng thao tác trực tiếp trên AI Karik Studio (bấm nút Studio Ảnh trên khung chat).
  5. Tuân thủ nghiêm ngặt quy chuẩn tại image.prompt.md.`;
    }

    if (agent.id === 'social') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT ĐĂNG BÀI MẠNG XÃ HỘI (Model: ${agent.model})]:
- Mục tiêu: Sáng tạo Caption bài viết bán hàng/giới thiệu SẢN PHẨM thu hút, canh lề đẹp mắt chuẩn phong cách Facebook, ngắt dòng thoáng mắt, bộ Hashtags chuẩn SEO/Viral và kích hoạt AI Browser Bot tự động mở trình duyệt đăng bài lên Facebook (kèm hình ảnh sản phẩm đã chỉnh sửa từ Karik Studio).
- Yêu cầu ban đầu của người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. QUY TẮC BẮT BUỘC VỀ CAPTION: Toàn bộ nội dung Caption PHẢI TẬP TRUNG 100% VÀO SẢN PHẨM / DỊCH VỤ / TÍNH NĂNG / LỢI ÍCH BÁN HÀNG CHO KHÁCH HÀNG / KHUYẾN MÃI / KÊU GỌI HÀNH ĐỘNG (CTA). TUYỆT ĐỐI KHÔNG viết phân tích kỹ thuật về poster, màu sắc, font chữ hay layer đồ họa.
  2. QUY CHUẨN CANH LỀ & XUỐNG DÒNG CHUẨN FACEBOOK:
     - BẮT BUỘC cách 1 dòng trống (\\n\\n) giữa các khối nội dung (Tiêu đề -> Mở đầu -> Khối tính năng -> Khối ưu đãi -> Lời kêu gọi CTA -> Hashtags) để tạo khoảng thở dễ đọc trên điện thoại, tuyệt đối không dính chùm chữ.
     - Tiêu đề Hook: Viết IN HOA kẹp icon bắt mắt đầu cuối (VD: 🔥 TIÊU ĐỀ SẢN PHẨM 🔥).
     - Khối tính năng/lợi ích: Từng ý xuống dòng riêng biệt (\\n), canh lề bằng bullet icon đồng bộ (🔹, 👉, ✅, ✨).
     - Khối CTA & Liên hệ: Xuống dòng rõ ràng cho Hotline/Zalo/Inbox.
  3. BẮT BUỘC xuất khối JSON cấu hình chuẩn với tag \`\`\`json:social-publish để hệ thống kích hoạt card AI Vào Trình Duyệt Đăng Bài. Giá trị trường "caption" PHẢI GIỮ NGUYÊN 100% các ký tự xuống dòng (\\n\\n và \\n) chuẩn xác như bản thảo:
     \`\`\`json:social-publish
     {
       "platform": "facebook",
       "headline": "Tiêu đề sản phẩm thu hút",
       "caption": "🔥 TIÊU ĐỀ SẢN PHẨM 🔥\\n\\nĐoạn mở đầu dẫn dắt...\\n\\n🔹 Tính năng 1\\n🔹 Tính năng 2\\n\\n🎁 Ưu đãi đặc biệt...\\n\\n👉 Inbox ngay để nhận ưu đãi!\\n☎️ Hotline/Zalo: 09xx.xxx.xxx",
       "hashtags": ["#aikarik", "#sanpham", "#viral"],
       "directUrls": {
         "facebook": "https://www.facebook.com/",
         "tiktok": "https://www.tiktok.com/tiktokstudio/upload"
       },
       "autoPublish": true
     }
     \`\`\`
  4. Thông báo cho người dùng biết họ có thể bấm nút "🤖 AI Vào Trình Duyệt Đăng Bài" để Bot tự động mở trình duyệt, đính kèm ảnh vừa chỉnh sửa từ Studio và đăng lên Facebook.
  5. Tuân thủ nghiêm ngặt quy chuẩn tại social.prompt.md.`;
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
