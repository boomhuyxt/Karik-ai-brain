const fs = require('fs');
const path = require('path');
const { uploadsPath } = require('../src/storage');

const accountId = '432a5a828609d79411ce6dda0f3bbfec';
const apiToken = 'cfut_CurP7bvw4U6lxjFqCE9TqmpmBw5fd2lTglOQsbW6f5b165d2';
const model = '@cf/black-forest-labs/flux-2-klein-9b';

async function testGenerate() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const formData = new FormData();
  formData.append('prompt', 'Hyper-realistic futuristic Vietnamese coffee shop at night, cinematic neon lights, ultra 8k resolution');
  formData.append('width', '1024');
  formData.append('height', '1024');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`
    },
    body: formData
  });

  const data = await res.json();
  if (data.result && data.result.image) {
    const buffer = Buffer.from(data.result.image, 'base64');
    const fileName = `generated_${Date.now()}.jpg`;
    const filePath = path.join(uploadsPath, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log('Successfully saved to:', filePath, 'Size:', buffer.length, 'bytes');
  } else {
    console.error('Failed to generate image:', data);
  }
}

testGenerate();
