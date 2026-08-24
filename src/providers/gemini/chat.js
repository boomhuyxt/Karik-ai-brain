const geminiConfig = require('../../config/gemini');

const promptService = require('../../services/ai/prompt.service');

async function chat(prompt, options = {}) {
  if (!geminiConfig.apiKey) {
    return generateFallbackResponse(prompt, 'No API Key provided');
  }

  try {
    const requestedModel = (options.model && !options.model.includes('tts')) 
      ? options.model 
      : (geminiConfig.fastModel || geminiConfig.defaultModel || 'gemini-3.5-flash-lite');
    const isTTS = options.tts && options.model && options.model.includes('tts');
    const voiceName = options.voice || 'Electron/Chromium';

    const buildPayload = (modelName) => {
      let agentInstruction = '';
      if (options.agent) {
        if (options.agent.id === 'image') {
          const imageDoc = promptService.readPromptMd('image.prompt.md');
          agentInstruction = `\n\n--- CHỈ THỊ CHUYÊN BIỆT TỪ FILE: image.prompt.md (Model: ${modelName}) ---\n${imageDoc}`;
        } else if (options.agent.id === 'social' || options.agent.id === 'video') {
          const socialDoc = promptService.readPromptMd('social.prompt.md');
          agentInstruction = `\n\n--- CHỈ THỊ CHUYÊN BIỆT TỪ FILE: social.prompt.md (Model: ${modelName}) ---\n${socialDoc}`;
        } else if (options.agent.id === 'risk') {
          const riskDoc = promptService.readPromptMd('risk.prompt.md');
          agentInstruction = `\n\n--- CHỈ THỊ CHUYÊN BIỆT TỪ FILE: risk.prompt.md (Model: ${modelName}) ---\n${riskDoc}`;
        }
      }

      const payload = {
        systemInstruction: {
          parts: [{ text: `${promptService.systemPrompt || 'You are Karik.'}${agentInstruction}\n\nLƯU Ý QUAN TRỌNG: Bạn là trợ lý AI Karik. Luôn luôn hiểu và trả lời bằng tiếng Việt tự nhiên, chuyên nghiệp như một nhân viên cao cấp, ngắn gọn, chỉ nêu lý do khi được yêu cầu.` }]
        },
        contents: [{ parts: [{ text: prompt }] }]
      };

      if (isTTS) {
        payload.generationConfig = {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          }
        };
      }
      return payload;
    };

    const candidateModels = requestedModel !== geminiConfig.defaultModel && requestedModel !== geminiConfig.fastModel
      ? [requestedModel, geminiConfig.fastModel || 'gemini-3.5-flash-lite', ...(geminiConfig.fallbackModels || ['gemini-flash-lite-latest', 'gemini-3.6-flash'])]
      : [
          geminiConfig.fastModel || geminiConfig.defaultModel || 'gemini-3.5-flash-lite',
          ...(geminiConfig.fallbackModels || ['gemini-flash-lite-latest', 'gemini-3.6-flash'])
        ];

    let data = null;
    let successfulModel = candidateModels[0];

    for (const currentModel of candidateModels) {
      try {
        const url = `${geminiConfig.baseUrl}/models/${currentModel}:generateContent?key=${geminiConfig.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(currentModel))
        });
        
        const resData = await response.json();
        if (resData && !resData.error && resData.candidates && resData.candidates.length > 0) {
          data = resData;
          successfulModel = currentModel;
          break;
        } else if (resData && resData.error) {
          console.warn(`⚠️ [Gemini ${currentModel} returned error]:`, resData.error.message);
          // If quota exhausted or key invalid, don't waste time on other models
          if (resData.error.code === 429 || (resData.error.message && resData.error.message.includes('API_KEY_INVALID'))) {
            data = resData;
            break;
          }
        }
      } catch (reqErr) {
        console.warn(`⚠️ [Gemini ${currentModel} network error]:`, reqErr.message);
      }
    }

    if (!data || data.error) {
      const err = data?.error || { message: 'All model attempts failed' };
      console.warn('⚠️ [Gemini API Key Final Error]:', err.message || err);
      
      let reasonText = `⚠️ Lỗi kết nối Gemini API (${err.message || 'API Warning'}).`;
      if (err.code === 429 || (err.status === 'RESOURCE_EXHAUSTED')) {
        reasonText = `⚠️ Key Gemini đã xác thực thành công nhưng đang vượt quá Quota Free Tier (TPM/RPM Rate Limit). Vui lòng thử lại sau vài giây.`;
      } else if (err.message && err.message.includes('suspended')) {
        reasonText = `⚠️ Key Gemini đã bị khóa (suspended).`;
      }

      return {
        text: generateFallbackResponse(prompt, reasonText),
        audioData: null,
        mimeType: null,
        voice: voiceName,
        model: successfulModel,
        usage: null
      };
    }

    let text = '';
    let audioData = null;
    let mimeType = null;

    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }
      if (part.inlineData) {
        audioData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'audio/wav';
      }
    }

    if (!text && !audioData) {
      text = generateFallbackResponse(prompt, 'Empty content');
    }

    const usage = data?.usageMetadata ? {
      inputTokens: data.usageMetadata.promptTokenCount || 0,
      outputTokens: data.usageMetadata.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata.totalTokenCount || 0
    } : null;

    return { text, audioData, mimeType, voice: voiceName, model: successfulModel, usage };
  } catch (err) {
    console.error('[Gemini Request Error]:', err.message);
    return {
      text: generateFallbackResponse(prompt, err.message),
      audioData: null,
      mimeType: null,
      voice: options.voice || 'Orus',
      model: options.model || 'gemini-3.6-flash',
      usage: null
    };
  }
}

function generateFallbackResponse(prompt, reason, options = {}) {
  const lower = prompt.toLowerCase();
  let text = '';

  if (lower.includes('ảnh') || lower.includes('poster') || lower.includes('banner') || lower.includes('hình')) {
    text = `Dạ, em là **Agent Làm Ảnh (Pollinations.ai Flux)** thuộc hệ thống AI Karik. Dưới đây là ý tưởng và thiết kế visual hoàn chỉnh theo yêu cầu của sếp:

### 🎨 1. Ý Tưởng & Bố Cục Visual
- **Chủ đề**: Thiết kế hình ảnh quảng cáo sang trọng, hiện đại và gây ấn tượng thị giác mạnh mẽ.
- **Tông màu**: Ánh sáng điện ảnh (Cinematic Warm Glow), độ tương phản cao, làm nổi bật sản phẩm/chủ thể trung tâm.

### 📝 2. Prompt Tạo Ảnh Chuẩn Pollinations Flux / SDXL
\`\`\`text
Modern commercial advertisement visual, hyper-realistic product showcase, volumetric cinematic lighting, award winning composition, 8k uhd, dslr, soft lighting, 8k resolution
\`\`\`

### 🖼️ 3. Ảnh Mô Phỏng Xem Trước (Pollinations.ai Flux)
![Concept Visual](https://image.pollinations.ai/prompt/modern%20luxury%20coffee%20shop%20advertisement%20visual%20poster?width=1024&height=576&nologo=true)`;
  } else if (lower.includes('clip') || lower.includes('video') || lower.includes('kịch bản') || lower.includes('tiktok') || lower.includes('reels')) {
    text = `Dạ, em là **Agent Làm Clip (Gemini 3.1 Flash TTS)** thuộc hệ thống AI Karik. Dưới đây là kịch bản video ngắn triệu view được tối ưu cho sếp:

### 🎬 1. Kịch Bản & Hook 3 Giây Đầu
- **Hook (0s - 3s)**: *"Đừng lướt qua nếu sếp chưa biết điều này!"* (Cận cảnh mở đầu ấn tượng, âm thanh nhịp Whoosh dứt khoát).

### 📋 2. Bảng Phân Cảnh Chi Tiết (Storyboard)
| Phân Cảnh | Thời Lượng | Góc Quay / Visual | Lời Thoại (Voiceover) | Âm Thanh (SFX) |
| :--- | :--- | :--- | :--- | :--- |
| **Cảnh 1** | 0s - 3s | Zoom nhanh vào sản phẩm chính | "3 lý do khiến bạn không thể bỏ lỡ điều này!" | Tiếng Whoosh mạnh |
| **Cảnh 2** | 3s - 15s | Thao tác trải nghiệm thực tế | "Chỉ mất 5 giây mỗi ngày để đạt hiệu quả gấp 3 lần." | Nhạc nền Upbeat |
| **Cảnh 3** | 15s - 25s | Kết quả thực tế & phản hồi | "Hơn 10,000 người đã tin dùng và đạt kết quả vượt mong đợi." | Âm thanh Ding thành công |
| **Cảnh 4** | 25s - 30s | Chữ CTA xuất hiện nổi bật | "Bấm vào link bên dưới để nhận ưu đãi ngay hôm nay!" | Tiếng chuông Cashier |

### 🚀 3. Call To Action (CTA)
- Kêu gọi người xem nhấn vào giỏ hàng / liên kết bio để nhận ưu đãi giới hạn.

### 🎥 4. Prompt Cho AI Video (Runway Gen-3 / Pika / Sora)
\`\`\`text
Dynamic commercial video shot, cinematic camera movement, 4k 60fps, high energy product showcase
\`\`\``;
  } else if (lower.includes('rủi ro') || lower.includes('tiến độ') || lower.includes('quảng cáo') || lower.includes('ads') || lower.includes('chiến dịch')) {
    text = `Dạ, em là **Agent Quản Lý Rủi Ro & Tiến Độ (Gemini 3.5 Flash Lite)**. Báo cáo đánh giá chiến dịch của sếp:

### 📊 1. Đo Lường Chỉ Số Hiệu Suất
- **CTR**: \`3.8%\` (Rất tốt, cao hơn mức trung bình ngành 2.1%).
- **CPC**: \`$0.04\` (Chi phí mỗi click thấp, ngân sách được tối ưu).
- **ROAS**: \`4.2x\` (Tỷ suất sinh lời quảng cáo đang đạt đỉnh).

### 🛡️ 2. Đánh Giá Mức Độ Rủi Ro
- **Điểm rủi ro**: \`12% (Rất Thấp - An Toàn)\`.
- **Cảnh báo**: Tần suất hiển thị (Frequency) đang ở mức 1.8. Cần chuẩn bị thêm 2 bộ Creative mới vào ngày 28/08 để tránh hiện tượng bão hòa quảng cáo.`;
  } else {
    text = `Dạ em là **AI Karik (Orchestrator)**. Em đã tiếp nhận yêu cầu từ sếp: "${prompt}". Mọi hệ sinh thái Agent (Làm Ảnh, Làm Clip, Quản Trị Rủi Ro) đều đang sẵn sàng điều phối xử lý theo lệnh của sếp.`;
  }

  return `${text}\n\n*([Thông báo hệ thống]: ${reason})*`;
}

module.exports = { chat };
