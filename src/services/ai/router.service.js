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

    // 3. Shop Smart Inventory & Sales Consulting Agent (Gemini 3.5 Flash Lite)
    const inventoryKeywords = [
      'tồn kho', 'kho hàng', 'danh sách kho', 'danh mục sản phẩm', 'phụ tùng',
      'nhớt', 'bugi', 'lốp xe', 'báo giá', 'giá bao nhiêu', 'còn hàng', 'hết hàng',
      'chốt đơn', 'đặt mua', 'mua hàng', 'lên đơn', 'xuất kho', 'nhập kho',
      'tư vấn bán hàng', 'doanh thu', 'danh thu', 'bán được gì', 'đã bán được gì',
      'bán bao nhiêu', 'tiền bán', 'báo cáo kho', 'báo cáo bán hàng', 'báo cáo doanh thu',
      'báo cáo danh thu', 'xuất file', 'xuất báo cáo', 'đưa ra file', 'tải file',
      'file danh thu', 'file doanh thu', 'file excel', 'bảng tính excel', 'danh sách sản phẩm',
      'bưu cục', 'vận đơn', 'mã vận đơn', 'đơn hàng'
    ];
    if (category === 'excel' || text.includes('.xlsx') || text.includes('.xls') || text.includes('.csv') || inventoryKeywords.some(kw => text.includes(kw))) {
      return geminiConfig.agents.inventory;
    }

    // 4. Ad Project Progress & Risk Management Agent
    const riskKeywords = [
      'rủi ro', 'tiến độ quảng cáo', 'dự án quảng cáo', 'chiến dịch quảng cáo',
      'độ rủi ro', 'kiểm tra tiến độ ads', 'bão hòa quảng cáo', 'lead ads'
    ];
    const riskRegex = /\b(ads|campaign|cpc|ctr|roas|cpa|chạy ads)\b/i;
    if (riskKeywords.some(kw => text.includes(kw)) || riskRegex.test(text)) {
      return geminiConfig.agents.risk;
    }

    // 5. Mặc định: AI Karik Main Orchestrator
    return geminiConfig.agents.orchestrator;
  }

  /**
   * AI Karik Prompt Engineering & Task Analysis Engine
   */
  buildOrchestratedPrompt(prompt = '', agent = null, context = '') {
    if (!agent || agent.id === 'orchestrator') {
      return prompt;
    }

    if (agent.id === 'inventory') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT QUẢN LÝ KHO & BÁN HÀNG (Model: ${agent.model})]:
- Mục tiêu: Quản lý danh mục kho hàng đa shop, tư vấn bán hàng chuyên nghiệp, báo giá chính xác, chốt đơn và lập báo cáo tồn kho cho chủ shop.
- Yêu cầu / Câu hỏi của người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. Nếu người dùng vừa gửi file Excel kho hàng: Xác nhận đã nạp và lưu trữ file an toàn, tổng hợp nhanh số lượng mặt hàng, tổng sản phẩm và danh mục chính.
  2. Nếu khách hỏi sản phẩm / báo giá: Báo giá bán lẻ chuẩn xác (VNĐ), dòng xe tương thích. TUYỆT ĐỐI KHÔNG LỘ GIÁ NHẬP VÀ VỊ TRÍ KHO.
  3. Nếu khách có ý định đặt mua: Thu thập Họ tên, SĐT, Địa chỉ để lên đơn và tính tổng tiền.
  4. Nếu chủ shop yêu cầu kiểm tra hàng sắp hết hoặc xuất báo cáo: Liệt kê các sản phẩm tồn dưới 15 cái (kèm vị trí kệ) hoặc tổng hợp doanh thu kèm đường dẫn tải file Excel tồn kho cập nhật.
  5. Tuân thủ nghiêm ngặt quy chuẩn tại inventory.prompt.md.`;
    }

    if (agent.id === 'image') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT STUDIO ẢNH & POSTER DESIGNER / ART DIRECTOR (Model: ${agent.model})]:
- Mục tiêu: Phân tích sâu yêu cầu của người dùng, sản phẩm và tự do sáng tạo bộ Concept Visual, bảng màu, typography và cấu trúc Layers độc bản cho AI Karik Studio.
- Yêu cầu ban đầu của người dùng: "${prompt}"
- Hồ sơ sở thích và lịch sử thiết kế gần đây: ${context || 'Chưa có dữ liệu; tự chọn hướng phù hợp và tạo signature mới.'}
- Hướng dẫn thực thi:
  1. TỶ LỆ KÍCH THƯỚC MẶC ĐỊNH: BẮT BUỘC mặc định tỷ lệ (9:16) 1080 x 1920 px (chuẩn Story / Reels / TikTok / Mobile Poster) cho toàn bộ poster và canvas trừ khi người dùng yêu cầu tỷ lệ khác rõ ràng.
  2. LẤY RANDOM ẢNH NỀN Ở MỤC XE & CƠ KHÍ: Tự động lấy RANDOM (ngẫu nhiên) một trong 8 ảnh nền ở mục "Xe & cơ khí" (Nhóm XE: XE-01 đến XE-08 trong Kho Mẫu Nền Poster Obsidian raw/nền poster/xe/) để làm nền poster, đảm bảo hình ảnh luôn tươi mới và không bị trùng lặp. Khai báo "backdropId" (ngẫu nhiên XE-01..XE-08) và "backdrop" đường dẫn file nền tương ứng trong json:poster-config.
  3. HEADLINE LUÔN NẰM GIỮA GIÁ TIỀN VÀ ẢNH SẢN PHẨM: Cấu trúc phân tầng dọc BẮT BUỘC sắp xếp theo thứ tự:
     - Tầng trên (y: ~10-12%): Khối Giá Tiền / Badge Giá Bán (ví dụ: "💰 GIÁ CHỈ: 450.000Đ" hoặc "GIÁ ƯU ĐÃI HÔM NAY").
     - Tầng giữa (y: ~20-22%): Tiêu Đề Chính (Headline) cỡ chữ 86px ("fontSize": 86) in hoa, có shadow/glow nổi bật.
     - Tầng dưới (y: ~56-58%): Ảnh Sản Phẩm (layer "main_subject" phóng to hero product scaling).
     => Headline BẮT BUỘC LUÔN NẰM GIỮA Giá tiền và Ảnh sản phẩm.
  4. GIÁ TIỀN CỠ CHỮ TRÊN 30PX & CHỮ GIỚI THIỆU SƠ LƯỢC DƯỚI ẢNH:
     - Chữ hiển thị giá ("price_badge_text") BẮT BUỘC có cỡ chữ trên 30px ("fontSize": 34 hoặc 36).
     - Phía dưới hình ảnh sản phẩm ("main_subject"), BẮT BUỘC có thêm layer chữ giới thiệu sơ lược về sản phẩm ("product_summary" tại y: ~81-84%) tóm tắt súc tích 1-2 dòng công năng, ưu điểm nổi bật.
  5. LÀM NÉT (SHARPEN) LÊN 50%: Ảnh sản phẩm (layer "main_subject") BẮT BUỘC phải được làm nét lên 50% thông qua cấu hình "adjustments": { "sharpen": 50 } để các chi tiết máy, nhãn mác, góc cạnh sản phẩm sắc nét tối đa.
  6. KHỐI ĐỒ HỌA BO GÓC (ROUNDED RECT): TUYỆT ĐỐI KHÔNG dùng hình vuông góc nhọn thông thường cho huy hiệu (badge), card nền hay nút bấm (CTA). BẮT BUỘC dùng hình vuông bo góc với type: "shape", shape: "roundedRect" và khai báo thuộc tính cornerRadius (16 - 30px) để tạo giao diện hiện đại, mềm mại và cao cấp.
  7. TIÊU ĐỀ HEADLINE ĐỔ BÓNG & PHÁT SÁNG (SHADOW / GLOW): Toàn bộ tiêu đề chính (headline / title) BẮT BUỘC phải được đổ bóng và phát sáng hợp lý (khai báo thuộc tính "shadow": { "color": "rgba(0,0,0,0.85)", "blur": 20, "offsetX": 0, "offsetY": 4 } hoặc glow phát sáng tương phản với màu nền) để chữ nổi bật, có chiều sâu 3D và không bị chìm vào hình nền.
  7. Chọn art direction theo ngành hàng, đối tượng, sở thích và lịch sử; không lặp bộ ba style + layout + palette gần nhất.
  8. Thiết kế theo pipeline hybrid: key visual không chữ do image model tạo; typography, badge và CTA là layer chỉnh sửa được.
  9. Lập Bảng phân lớp thiết kế (Layer Specifications: Nền, Hình ảnh, Typography, Shapes/Huy hiệu, Hiệu ứng Filters, Tách nền Magic Cut) và xuất cấu hình json:poster-config schema 3.0 chuẩn xác.
  10. Hướng dẫn người dùng thao tác trực tiếp trên AI Karik Studio (bấm nút Studio Ảnh trên khung chat).
  11. BẮT BUỘC VỀ CAPTION ĐĂNG BÀI (publishing.productCaption): Trong json:poster-config, trường productCaption PHẢI CHỈ NÊU VỀ SẢN PHẨM & GIÁ BÁN / GIÁ ƯU ĐÃI / TÍNH NĂNG / KHUYẾN MÃI / CTA CHỐT ĐƠN. TUYỆT ĐỐI NGHIÊM CẤM đưa các câu mô tả kỹ thuật thiết kế poster, bố cục, màu sắc, font chữ hay layer vào productCaption.
  12. Tuân thủ nghiêm ngặt quy chuẩn tại image.prompt.md và poster.prompt.md.`;
    }

    if (agent.id === 'social') {
      return `[CHỈ THỊ ĐIỀU PHỐI TỪ AI KARIK ORCHESTRATOR -> AGENT ĐĂNG BÀI MẠNG XÃ HỘI (Model: ${agent.model})]:
- Mục tiêu: Sáng tạo Caption bài viết bán hàng/giới thiệu SẢN PHẨM thu hút, canh lề đẹp mắt chuẩn phong cách Facebook, ngắt dòng thoáng mắt, bộ Hashtags chuẩn SEO/Viral và kích hoạt AI Browser Bot tự động mở trình duyệt đăng bài lên Facebook (kèm hình ảnh sản phẩm đã chỉnh sửa từ Karik Studio).
- Yêu cầu ban đầu của người dùng: "${prompt}"
- Hướng dẫn thực thi:
  1. QUY TẮC BẮT BUỘC VỀ CAPTION: Toàn bộ nội dung Caption PHẢI TẬP TRUNG 100% VÀO SẢN PHẨM / GIÁ BÁN & GIÁ ƯU ĐÃI / TÍNH NĂNG / LỢI ÍCH BÁN HÀNG CHO KHÁCH HÀNG / KHUYẾN MÃI / KÊU GỌI HÀNH ĐỘNG (CTA). TUYỆT ĐỐI KHÔNG viết phân tích kỹ thuật về poster, màu sắc, font chữ hay layer đồ họa.
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
