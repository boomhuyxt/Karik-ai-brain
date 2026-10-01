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

test('already transparent PNG is preserved intact without corrupting dark product details', () => {
  const w = 10;
  const h = 10;
  const transparentImg = solidImage(w, h, [0, 0, 0]);
  for (let x = 0; x < w; x++) {
    transparentImg[x * 4 + 3] = 0;
    transparentImg[((h - 1) * w + x) * 4 + 3] = 0;
  }
  for (let y = 0; y < h; y++) {
    transparentImg[(y * w) * 4 + 3] = 0;
    transparentImg[(y * w + w - 1) * 4 + 3] = 0;
  }
  const centerOffset = (5 * w + 5) * 4;
  transparentImg.set([15, 15, 15, 255], centerOffset);

  const res = backgroundRemoval.removeBackgroundPixels(transparentImg, w, h);
  assert.equal(res.applied, true);
  assert.equal(res.alreadyCutout, true);
  assert.equal(res.pixels[centerOffset + 3], 255, 'Black product in transparent PNG must remain intact');
});

test('edge gradient barrier protects white product from being eroded on white background', () => {
  const w = 12;
  const h = 12;
  const whiteImg = solidImage(w, h, [255, 255, 255]);
  for (let y = 3; y <= 8; y++) {
    for (let x = 3; x <= 8; x++) {
      if (x === 3 || x === 8 || y === 3 || y === 8) {
        whiteImg.set([210, 210, 210, 255], (y * w + x) * 4);
      } else {
        whiteImg.set([250, 250, 250, 255], (y * w + x) * 4);
      }
    }
  }
  const res = backgroundRemoval.removeBackgroundPixels(whiteImg, w, h, { tolerance: 22, detailProtection: 'high' });
  assert.equal(res.applied, true);
  assert.equal(res.pixels[(5 * w + 5) * 4 + 3], 255, 'White product body behind edge must be protected');
});

test('island pruning automatically cleans stray dust specks and artifacts in the background', () => {
  const w = 30;
  const h = 30;
  const img = solidImage(w, h, [255, 255, 255]); // white background
  
  // Product in center: [8..22, 8..22]
  for (let y = 8; y <= 22; y++) {
    for (let x = 8; x <= 22; x++) {
      img.set([40, 40, 50, 255], (y * w + x) * 4);
    }
  }

  // Floating stray dust / compression artifact specks in background
  img.set([120, 120, 120, 255], (3 * w + 3) * 4);
  img.set([110, 110, 110, 255], (4 * w + 26) * 4);
  img.set([130, 130, 130, 255], (26 * w + 4) * 4);

  const res = backgroundRemoval.removeBackgroundPixels(img, w, h, { tolerance: 25 });
  assert.equal(res.applied, true);
  assert.equal(res.pixels[(3 * w + 3) * 4 + 3], 0, 'Stray speck at (3,3) must be cleared to 0 alpha');
  assert.equal(res.pixels[(4 * w + 26) * 4 + 3], 0, 'Stray speck at (4,26) must be cleared to 0 alpha');
  assert.equal(res.pixels[(26 * w + 4) * 4 + 3], 0, 'Stray speck at (26,4) must be cleared to 0 alpha');
  assert.equal(res.pixels[(15 * w + 15) * 4 + 3], 255, 'Product center must remain 100% solid');
});

test('topological hole recovery restores white internal logo and specular highlights inside product', () => {
  const w = 30;
  const h = 30;
  const img = solidImage(w, h, [255, 255, 255]); // white background

  // Dark product body in center
  for (let y = 8; y <= 22; y++) {
    for (let x = 8; x <= 22; x++) {
      img.set([30, 30, 40, 255], (y * w + x) * 4);
    }
  }
  // Internal white highlight / logo inside the product at [14..16, 14..16]
  for (let y = 14; y <= 16; y++) {
    for (let x = 14; x <= 16; x++) {
      img.set([255, 255, 255, 255], (y * w + x) * 4);
    }
  }

  const res = backgroundRemoval.removeBackgroundPixels(img, w, h, { tolerance: 25 });
  assert.equal(res.applied, true);
  assert.equal(res.pixels[0 + 3], 0, 'Outer white background must be cleared');
  assert.equal(res.pixels[(15 * w + 15) * 4 + 3], 255, 'Internal white highlight inside product must remain 100% opaque');
  assert.equal(res.pixels[(10 * w + 10) * 4 + 3], 255, 'Product body must remain 100% opaque');
});
