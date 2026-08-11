const ttsService = require('../src/services/tts.service');

async function test() {
  try {
    const buf = await ttsService.generateSpeechBuffer('Xin chào sếp');
    console.log('Buffer result:', buf ? buf.length : 'NULL');
  } catch (e) {
    console.error('TTS Test Error:', e.message);
  }
}

test();
