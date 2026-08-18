const geminiConfig = require('../../config/gemini');

class RouterService {
  isProviderAvailable(provider) {
    return provider === 'gemini' ? Boolean(geminiConfig.apiKey) : false;
  }

  getDefaultAvailableProvider() {
    return 'gemini';
  }

  selectProvider() {
    // Exclusively use Google Gemini
    return 'gemini';
  }
}

module.exports = new RouterService();

