const accountId = '432a5a828609d79411ce6dda0f3bbfec';
const apiToken = 'cfut_CurP7bvw4U6lxjFqCE9TqmpmBw5fd2lTglOQsbW6f5b165d2';
const model = '@cf/black-forest-labs/flux-2-klein-9b';

async function test() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  console.log('Calling:', url);
  try {
    const formData = new FormData();
    formData.append('prompt', 'a beautiful cyber car on neon city street, 8k resolution, cinematic lighting');
    formData.append('width', '1024');
    formData.append('height', '1024');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      body: formData
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      console.log('JSON Response:', JSON.stringify(json).slice(0, 500));
    } else {
      const buffer = await res.arrayBuffer();
      console.log('Binary image received, size:', buffer.byteLength, 'bytes');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
