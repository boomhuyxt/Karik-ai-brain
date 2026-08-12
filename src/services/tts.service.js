const https = require('https');

class TTSService {
  detectLanguage(text) {
    const vietnameseRegex = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    return vietnameseRegex.test(text) ? 'vi' : 'en';
  }

  async generateSpeechBuffer(text, lang = 'auto') {
    if (!text || !text.trim()) return null;

    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Đã có đoạn mã đính kèm. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/---\n?/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .slice(0, 300)
      .trim();

    if (!cleanText) return null;

    const targetLang = (!lang || lang === 'auto') ? this.detectLanguage(cleanText) : lang;

    return new Promise((resolve, reject) => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(targetLang)}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      };
      
      https.get(url, options, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`TTS Service returned status ${res.statusCode}`));
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', err => reject(err));
    });
  }
}

module.exports = new TTSService();
