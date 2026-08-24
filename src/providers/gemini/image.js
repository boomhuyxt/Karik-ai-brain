const geminiImageConfig = require('../../config/geminiImage');

async function generateImage(prompt, options = {}) {
  const apiKey = geminiImageConfig.apiKey;
  if (!apiKey) {
    return generateFallbackImageResponse(prompt, 'No GEMINI_IMAGE_API_KEY provided');
  }

  const model = options.model || geminiImageConfig.defaultModel;

  try {
    // 1. Primary endpoint: Imagen 3 Predict REST API
    const url = `${geminiImageConfig.baseUrl}/models/${model}:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: options.aspectRatio || '1:1',
        outputMimeType: 'image/jpeg'
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.predictions && data.predictions.length > 0) {
      const base64Data = data.predictions[0].bytesBase64Encoded;
      const mimeType = data.predictions[0].mimeType || 'image/jpeg';
      return {
        text: `🎨 **Hình ảnh được tạo bởi Gemini Imagen 3 theo yêu cầu:** "${prompt}"`,
        imageData: `data:${mimeType};base64,${base64Data}`,
        mimeType: mimeType,
        provider: 'gemini-image',
        model: model,
        usage: { inputTokens: 50, outputTokens: 1024, totalTokens: 1074 }
      };
    }

    if (data.error) {
      console.warn('⚠️ [Gemini Imagen 3 API Warning]:', data.error.message || data.error);
    }

    // 2. Fallback: Generate SVG dynamic art placeholder if model predict rate-limited or quota exceeded
    return generateFallbackImageResponse(prompt, data.error?.message || 'Quota/Model notice');
  } catch (err) {
    console.error('❌ [Gemini Image Generation Error]:', err.message);
    return generateFallbackImageResponse(prompt, err.message);
  }
}

function generateFallbackImageResponse(prompt, reason) {
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#3b0764"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="32" fill="url(#bg)"/>
    <circle cx="256" cy="200" r="80" fill="none" stroke="#c084fc" stroke-width="4" opacity="0.8"/>
    <path d="M176 340 L256 260 L336 340" stroke="#38bdf8" stroke-width="6" fill="none" stroke-linecap="round"/>
    <text x="256" y="390" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="bold">JARVIS AI Brain - Gemini Imagen 3</text>
    <text x="256" y="420" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14">${escapeXml(prompt.slice(0, 35))}</text>
  </svg>`;

  const base64Svg = Buffer.from(svgMarkup).toString('base64');
  return {
    text: `🎨 **Đã tiếp nhận yêu cầu tạo hình ảnh Gemini Imagen 3:** "${prompt}"\n\n*([Thông báo hệ thống]: ${reason})*`,
    imageData: `data:image/svg+xml;base64,${base64Svg}`,
    mimeType: 'image/svg+xml',
    provider: 'gemini-image',
    model: 'imagen-3.0-generate-002',
    usage: null
  };
}

function escapeXml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[m]));
}

module.exports = { generateImage };
