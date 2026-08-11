const https = require('https');
const http = require('http');

async function testGoogleTTS(text) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(text)}`;
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`Google TTS Audio size: ${buffer.length} bytes`);
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

testGoogleTTS('Xin chào sếp, em là Jarvis đây ạ').then(() => {
  console.log('✅ Google TTS Test completed!');
}).catch(err => {
  console.error('❌ Error:', err);
});
