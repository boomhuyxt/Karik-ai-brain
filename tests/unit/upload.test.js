const test = require('node:test');
const assert = require('node:assert');
const uploadController = require('../../src/controllers/upload.controller');

test('UploadController - File Upload & Validation Suite', async (t) => {
  // Mock Response Object
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      }
    };
    return res;
  };

  // 1. Test Valid Image Upload
  const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const reqValid = {
    body: {
      fileName: 'test_sample.png',
      fileType: 'image/png',
      fileSize: 1024,
      base64Data: sampleBase64
    }
  };
  const resValid = createMockRes();
  await uploadController.uploadFile(reqValid, resValid, () => {});

  assert.strictEqual(resValid.statusCode, 200);
  assert.strictEqual(resValid.jsonData.success, true);
  assert.strictEqual(resValid.jsonData.file.category, 'image');
  assert.ok(resValid.jsonData.file.url.startsWith('/uploads/'));

  // 2. Test Exceeding 50MB File Size Error
  const reqOverSize = {
    body: {
      fileName: 'huge_video.mp4',
      fileType: 'video/mp4',
      fileSize: 60 * 1024 * 1024, // 60MB > 50MB
      base64Data: sampleBase64
    }
  };
  const resOverSize = createMockRes();
  await uploadController.uploadFile(reqOverSize, resOverSize, () => {});

  assert.strictEqual(resOverSize.statusCode, 400);
  assert.strictEqual(resOverSize.jsonData.success, false);
  assert.ok(resOverSize.jsonData.error.includes('50MB'));

  // 3. Test Unsupported File Format Error
  const reqInvalidExt = {
    body: {
      fileName: 'dangerous_script.exe',
      fileType: 'application/octet-stream',
      fileSize: 1024,
      base64Data: sampleBase64
    }
  };
  const resInvalidExt = createMockRes();
  await uploadController.uploadFile(reqInvalidExt, resInvalidExt, () => {});

  assert.strictEqual(resInvalidExt.statusCode, 400);
  assert.strictEqual(resInvalidExt.jsonData.success, false);
  assert.ok(resInvalidExt.jsonData.error.includes('không được hỗ trợ'));

  console.log('✅ Upload Controller 50MB & Format Validation unit tests passed successfully!');
});
