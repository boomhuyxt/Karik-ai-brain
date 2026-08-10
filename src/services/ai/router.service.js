class RouterService {
  selectProvider(prompt = '', category = '') {
    const lower = (prompt + ' ' + category).toLowerCase();

    if (lower.includes('code') || lower.includes('lap trinh') || lower.includes('function') || lower.includes('bug')) {
      return 'openai';
    }
    if (lower.includes('nghien cuu') || lower.includes('research') || lower.includes('tim hieu') || lower.includes('wiki')) {
      return 'gemini';
    }
    if (lower.includes('nhanh') || lower.includes('fast') || lower.includes('tom tat') || lower.includes('quick')) {
      return 'groq';
    }
    if (lower.includes('phan tich') || lower.includes('long') || lower.includes('sau') || lower.includes('analysis')) {
      return 'claude';
    }

    return 'gemini'; // Default AI provider
  }
}

module.exports = new RouterService();
