const test = require('node:test');
const assert = require('node:assert/strict');
const backgroundRemoval = require('../../public/js/imageBackgroundRemoval');

function solidImage(width, height, color) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels.set([...color, 255], i);
  }
  return pixels;
}

test('background removal only clears matching pixels connected to the image border', () => {
  const width = 5;
  const height = 5;
  const pixels = solidImage(width, height, [255, 255, 255]);

  for (let y = 1; y <= 3; y += 1) {
    for (let x = 1; x <= 3; x += 1) {
      pixels.set([220, 35, 45, 255], (y * width + x) * 4);
    }
  }
  pixels.set([255, 255, 255, 255], (2 * width + 2) * 4);

  const result = backgroundRemoval.removeBackgroundPixels(pixels, width, height, { tolerance: 30 });
  assert.equal(result.applied, true);
  assert.equal(result.pixels[3], 0, 'outer white background should be transparent');
  assert.equal(result.pixels[(2 * width + 2) * 4 + 3], 255, 'enclosed highlight inside subject must survive');
  assert.equal(result.pixels[(1 * width + 1) * 4 + 3], 255, 'foreground edge alpha must not be eroded');
});

test('high detail protection preserves low-contrast metallic details near a dark background', () => {
  const width = 7;
  const height = 7;
  const pixels = solidImage(width, height, [20, 25, 35]);

  for (let y = 2; y <= 4; y += 1) {
    for (let x = 2; x <= 4; x += 1) pixels.set([130, 135, 145, 255], (y * width + x) * 4);
  }
  pixels.set([55, 60, 70, 255], (2 * width + 1) * 4);

  const result = backgroundRemoval.removeBackgroundPixels(pixels, width, height, {
    tolerance: 30,
    detailProtection: 'high'
  });
  assert.equal(result.applied, true);
  assert.equal(result.pixels[(2 * width + 1) * 4 + 3], 255, 'low-contrast product detail should remain opaque');
});

test('background removal refuses a complex multicolour border instead of damaging the subject', () => {
  const width = 8;
  const height = 8;
  const pixels = solidImage(width, height, [120, 120, 120]);
  for (let x = 0; x < width; x += 1) {
    pixels.set(x % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255], x * 4);
    pixels.set(x % 2 ? [0, 0, 0, 255] : [255, 255, 255, 255], ((height - 1) * width + x) * 4);
  }
  for (let y = 1; y < height - 1; y += 1) {
    pixels.set(y % 2 ? [255, 0, 0, 255] : [0, 0, 255, 255], (y * width) * 4);
    pixels.set(y % 2 ? [0, 255, 0, 255] : [255, 255, 0, 255], (y * width + width - 1) * 4);
  }

  const result = backgroundRemoval.removeBackgroundPixels(pixels, width, height, { tolerance: 30 });
  assert.equal(result.applied, false);
  assert.match(result.reason, /phức tạp/);
});
