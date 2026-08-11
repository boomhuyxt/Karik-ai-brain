const crypto = require('crypto');
const https = require('https');

// Microsoft Edge TTS Endpoint Helper for vi-VN-NamMinhNeural
function getEdgeTTSUrl(text, voice = 'vi-VN-NamMinhNeural') {
  const cleanText = text.replace(/[*#`_~>]/g, '').slice(0, 300);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
}

console.log('Testing Edge TTS helper...');
