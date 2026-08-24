class CloudflareService {
  async chat(prompt, options = {}) {
    return { text: 'Cloudflare service is disabled.' };
  }
}

module.exports = new CloudflareService();
