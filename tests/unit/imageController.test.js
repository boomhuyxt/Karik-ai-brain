const test = require('node:test');
const assert = require('node:assert/strict');
const imageController = require('../../src/controllers/image.controller');
const geminiImageService = require('../../src/services/providers/geminiImage.service');

function createResponse() {
  return { payload: null, json(payload) { this.payload = payload; return payload; } };
}

test('image controller exposes catalog and creates personalized variants', async () => {
  const catalogResponse = createResponse();
  imageController.getCatalog({}, catalogResponse);
  assert.ok(catalogResponse.payload.styles.length >= 10);

  const designResponse = createResponse();
  let capturedError = null;
  await imageController.createDesign({ body: { brief: 'Poster workshop thiết kế cho sinh viên', variantCount: 3 } }, designResponse, error => { capturedError = error; });
  assert.equal(capturedError, null);
  assert.equal(designResponse.payload.success, true);
  assert.equal(designResponse.payload.variants.length, 3);
});

test('image profile endpoint requires an authenticated user', async () => {
  const response = createResponse();
  let capturedError = null;
  await imageController.getProfile({}, response, error => { capturedError = error; });
  assert.equal(capturedError.statusCode, 401);
});

test('hybrid generation sends a text-free key visual prompt to the image provider', async () => {
  const originalGenerateImage = geminiImageService.generateImage;
  let receivedPrompt = '';
  geminiImageService.generateImage = async prompt => {
    receivedPrompt = prompt;
    return { imageData: 'data:image/png;base64,dGVzdA==', mimeType: 'image/png' };
  };

  try {
    const response = createResponse();
    let capturedError = null;
    await imageController.generateImage({ body: { brief: 'Poster sản phẩm công nghệ mới' } }, response, error => { capturedError = error; });
    assert.equal(capturedError, null);
    assert.equal(response.payload.success, true);
    assert.match(receivedPrompt, /Text: none/);
    assert.match(receivedPrompt, /Avoid: words, letters, numbers/);
  } finally {
    geminiImageService.generateImage = originalGenerateImage;
  }
});
