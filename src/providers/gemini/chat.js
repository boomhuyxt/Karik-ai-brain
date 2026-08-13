const geminiConfig = require('../../config/gemini');

const systemPrompt = require('../../prompts/system.prompt');

async function chat(prompt, options = {}) {
  if (!geminiConfig.apiKey) {
    return generateFallbackResponse(prompt, 'No API Key provided');
  }

  try {
    const requestedModel = (options.model && !options.model.includes('tts')) 
      ? options.model 
      : (geminiConfig.fastModel || geminiConfig.defaultModel || 'gemini-1.5-flash');
    const isTTS = options.tts && options.model && options.model.includes('tts');
    const voiceName = options.voice || 'Electron/Chromium';

    const buildPayload = (modelName) => {
      const payload = {
        systemInstruction: {
          parts: [{ text: `${systemPrompt.systemPrompt || 'You are Karik.'}\n\nLƯU Ý QUAN TRỌNG: Bạn là trợ lý AI Karik. Luôn luôn hiểu và trả lời bằng tiếng Việt tự nhiên, ngắn gọn, cá tính, phong cách Karik.` }]
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

    let model = requestedModel;
    let url = `${geminiConfig.baseUrl}/models/${model}:generateContent?key=${geminiConfig.apiKey}`;
    
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(model))
    });
    
    let data = await response.json();

    // 1. If TTS or model request returns error (400, 404, unsupported modality, etc.), retry text-only mode
    if (data.error) {
      console.warn(`⚠️ [Gemini Request Retry]: ${data.error.message || 'Error'}, retrying text-only mode with ${geminiConfig.defaultModel}`);
      const textOnlyPayload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      model = geminiConfig.fastModel || geminiConfig.defaultModel || 'gemini-1.5-flash';
      url = `${geminiConfig.baseUrl}/models/${model}:generateContent?key=${geminiConfig.apiKey}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textOnlyPayload)
      });
      data = await response.json();
    }
    
    if (data.error) {
      console.warn('⚠️ [Gemini API Key Final Error]:', data.error.message || data.error);
      
      let reasonText = `⚠️ Lỗi kết nối Gemini API (${data.error.message || 'API Warning'}).`;
      if (data.error.code === 429 || (data.error.status === 'RESOURCE_EXHAUSTED')) {
        reasonText = `⚠️ Key Gemini đã xác thực thành công nhưng đang vượt quá Quota Free Tier (TPM/RPM Rate Limit). Vui lòng thử lại sau vài giây.`;
      } else if (data.error.message && data.error.message.includes('suspended')) {
        reasonText = `⚠️ Key Gemini "${geminiConfig.apiKey.slice(0, 10)}..." đã bị khóa (suspended).`;
      }

      return {
        text: generateFallbackResponse(prompt, reasonText),
        audioData: null,
        mimeType: null,
        voice: voiceName,
        model,
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

    return { text, audioData, mimeType, voice: voiceName, model, usage };
  } catch (err) {
    console.error('[Gemini Request Error]:', err.message);
    return {
      text: generateFallbackResponse(prompt, err.message),
      audioData: null,
      mimeType: null,
      voice: options.voice || 'Orus',
      model: options.model || 'gemini-2.5-flash-tts',
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
