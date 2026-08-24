const fs = require('fs');
const path = require('path');
const sdConfig = require('../../config/stableDiffusion');
const { uploadsPath } = require('../../storage');

/**
 * Generate image using Stable Diffusion WebUI API (AUTOMATIC1111 / Forge / SD.Next)
 * @param {string} prompt - Image generation prompt
 * @param {object} options - Options { negativePrompt, width, height, aspectRatio, steps, cfgScale, samplerName, seed }
 * @returns {Promise<{ success: boolean, url: string, base64: string, mimeType: string, model: string, fileName?: string, filePath?: string, size?: number, error?: string }>}
 */
async function generateImage(prompt, options = {}) {
  const model = options.model || sdConfig.defaultModel;
  const apiUrl = options.apiUrl || sdConfig.apiUrl;

  let width = options.width;
  let height = options.height;

  if (!width || !height) {
    if (options.aspectRatio && sdConfig.aspectRatios[options.aspectRatio]) {
      width = sdConfig.aspectRatios[options.aspectRatio].width;
      height = sdConfig.aspectRatios[options.aspectRatio].height;
    } else {
      width = 512;
      height = 512;
    }
  }

  const negativePrompt = options.negativePrompt || options.negative_prompt || sdConfig.negativePrompt;
  const steps = options.steps || sdConfig.steps || 20;
  const cfgScale = options.cfgScale || options.cfg_scale || sdConfig.cfgScale || 7;
  const samplerName = options.samplerName || options.sampler_name || sdConfig.samplerName || 'Euler a';
  const seed = options.seed !== undefined ? options.seed : -1;

  const payload = {
    prompt: prompt || '',
    negative_prompt: negativePrompt,
    steps,
    cfg_scale: cfgScale,
    sampler_name: samplerName,
    width,
    height,
    seed,
    batch_size: 1,
    n_iter: 1
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `SD WebUI returned HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.detail || errorJson.error || errorJson.message || errorMsg;
      } catch (e) {
        if (errorText) errorMsg = errorText;
      }

      console.warn('⚠️ [Stable Diffusion API Error]:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        url: null,
        base64: null,
        model
      };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.images) || data.images.length === 0) {
      return {
        success: false,
        error: 'Stable Diffusion WebUI không trả về dữ liệu ảnh hợp lệ',
        url: null,
        base64: null,
        model
      };
    }

    // Process base64 string from SD WebUI
    let rawBase64 = data.images[0];
    if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    if (!buffer || buffer.length === 0) {
      return {
        success: false,
        error: 'Không thể giải mã dữ liệu ảnh từ Stable Diffusion WebUI',
        url: null,
        base64: null,
        model
      };
    }

    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).slice(2, 7);
    const fileName = `sd_${timestamp}_${randomSuffix}.png`;
    const filePath = path.join(uploadsPath, fileName);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/${fileName}`;

    return {
      success: true,
      url: fileUrl,
      fileName,
      filePath,
      base64: rawBase64,
      mimeType: 'image/png',
      model,
      prompt,
      size: buffer.length,
      parameters: data.parameters || null,
      info: data.info || null
    };
  } catch (err) {
    const isConnRefused = err.cause?.code === 'ECONNREFUSED' ||
      err.code === 'ECONNREFUSED' ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('Failed to fetch');

    const errorMessage = isConnRefused
      ? `Không thể kết nối đến Stable Diffusion WebUI tại ${apiUrl}. Vui lòng đảm bảo SD WebUI đang chạy với cờ --api trên cổng 7860.`
      : `Lỗi kết nối Stable Diffusion: ${err.message}`;

    console.error('❌ [Stable Diffusion Exception]:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      url: null,
      base64: null,
      model
    };
  }
}

/**
 * Health check or ping SD WebUI API
 * @param {string} baseUrl
 * @returns {Promise<boolean>}
 */
async function ping(baseUrl = sdConfig.baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/sdapi/v1/sd-models`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = {
  generateImage,
  ping
};
