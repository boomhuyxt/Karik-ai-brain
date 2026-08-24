const geminiImageProvider = require('../../providers/gemini/image');

class GeminiImageService {
  async chat(prompt, options) {
    return await geminiImageProvider.generateImage(prompt, options);
  }

  async generateImage(prompt, options) {
    return await geminiImageProvider.generateImage(prompt, options);
  }
}

module.exports = new GeminiImageService();
