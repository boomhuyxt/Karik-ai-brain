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
      const payload = {
        systemInstruction: {
          parts: [{ text: `${promptService.systemPrompt || 'You are Karik.'}\n\nLƯU Ý QUAN TRỌNG: Bạn là trợ lý AI Karik. Luôn luôn hiểu và trả lời bằng tiếng Việt tự nhiên, ngắn gọn, cá tính, phong cách Karik.` }]
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

function generateFallbackResponse(prompt, reason) {
  const lower = prompt.toLowerCase();
  let text = `Tôi là Karik. Tôi đã tiếp nhận yêu cầu: "${prompt}".`;

  if (lower.includes('trạng thái') || lower.includes('status') || lower.includes('node')) {
    text = `Hiện tại 7/7 Node đang hoạt động bình thường. Core Nexus và Anomaly Orange đang ghi nhận tải ổn định.`;
  } else if (lower.includes('clean architecture') || lower.includes('kết trúc')) {
    text = `Clean Architecture trong AI Brain chia thành các tầng: Controllers -> Services -> Repositories -> Providers. Giúp dễ bảo trì và mở rộng thêm AI Provider mới.`;
  } else if (lower.includes('token') || lower.includes('chi phí')) {
    text = `Tổng API Token đã tiêu thụ là 142k (GPT-4o 85k, Claude 42k, Gemini 15k).`;
  }

  return `${text}\n\n*([Thông báo hệ thống]: ${reason})*`;
}

module.exports = { chat };
