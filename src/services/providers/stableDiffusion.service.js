class StableDiffusionService {
  async generateImage(prompt, options = {}) {
    return { success: false, error: 'Stable Diffusion service is disabled in favor of AI Karik Studio.' };
  }

  async ping(baseUrl) {
    return { status: 'disabled' };
  }
}

module.exports = new StableDiffusionService();
