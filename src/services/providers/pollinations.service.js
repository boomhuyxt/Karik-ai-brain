class PollinationsService {
  async generateImage(prompt, options = {}) {
    return { success: false, error: 'Pollinations service is disabled in favor of AI Karik Studio.' };
  }
}

module.exports = new PollinationsService();
