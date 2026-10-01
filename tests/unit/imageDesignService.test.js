const test = require('node:test');
const assert = require('node:assert/strict');
const imageDesignService = require('../../src/services/image/imageDesign.service');

test('image design service creates three diverse editable hybrid variants', () => {
  const variants = imageDesignService.createDesignSet({
    brief: 'Poster ra mắt cà phê rang thủ công cho người trẻ ở thành phố',
    aspectRatio: '4:5',
    variantCount: 3,
    preferences: {
      preferredStyles: ['heritage_craft'],
      brandColors: ['#3A2418', '#E8C58A'],
      audience: 'người trẻ yêu cà phê thủ công',
      mood: 'ấm áp và chân thật'
    }
  });

  assert.equal(variants.length, 3);
  assert.equal(new Set(variants.map(item => item.signature)).size, 3);
  assert.ok(variants.every(item => item.schemaVersion === '3.0'));
  assert.ok(variants.every(item => item.layers.some(layer => layer.id === 'main_subject')));
  assert.ok(variants.every(item => item.layers.some(layer => layer.id === 'headline')));
  assert.ok(variants.every(item => !item.layers.some(layer => layer.id === 'atmosphere')));
  assert.ok(variants.every(item => {
    const headline = item.layers.find(layer => layer.id === 'headline');
    return headline.width >= 35 && headline.height >= 15 && headline.minFontSize;
  }));
  assert.ok(variants.every(item => item.layers.length >= 9));
  assert.ok(variants.every(item => item.keyVisual.prompt.includes('Text: none')));
  assert.ok(variants.every(item => item.keyVisual.prompt.includes('generic abstract chrome sculpture')));
  assert.ok(variants.every(item => !item.keyVisual.prompt.includes('undefined')));
});

test('default copy derives a short headline instead of placing the full brief on one line', () => {
  const [variant] = imageDesignService.createDesignSet({
    brief: 'Thiết kế một poster giới thiệu dịch vụ sáng tạo chuyên nghiệp dành cho doanh nghiệp hiện đại',
    variantCount: 1
  });
  const headline = variant.layers.find(layer => layer.id === 'headline');
  assert.ok(headline.text.length <= 54);
  assert.ok(headline.text.split(/\s+/).length <= 7);
  assert.notEqual(headline.text, 'THIẾT KẾ MỘT POSTER GIỚI THIỆU DỊCH VỤ SÁNG TẠO CHUYÊN NGHIỆP DÀNH CHO DOANH NGHIỆP HIỆN ĐẠI');
});

test('image design service penalizes recent signatures and sanitizes preferences', () => {
  const preferences = imageDesignService.normalizePreferences({
    preferredStyles: ['data_futurism', 'data_futurism'],
    avoidedStyles: ['cinematic_noir'],
    brandColors: ['#112233', 'red', '#AABBCC'],
    density: 'unknown'
  });
  const variants = imageDesignService.createDesignSet({
    brief: 'Chiến dịch AI cho doanh nghiệp',
    preferences,
    history: [
      { style: 'data_futurism', layout: 'hero_center', palette: 'ink_cyan' },
      { style: 'data_futurism', layout: 'hero_center', palette: 'ink_cyan' }
    ]
  });

  assert.deepEqual(preferences.brandColors, ['#112233', '#AABBCC']);
  assert.equal(preferences.density, 'balanced');
  assert.ok(variants.every(item => item.style !== 'cinematic_noir'));
  assert.ok(variants.some(item => item.layout !== 'hero_center'));
});

test('image design service rejects an empty creative brief', () => {
  assert.throws(() => imageDesignService.createDesignSet({ brief: '   ' }), /Creative brief is required/);
});

test('image design service loads Picsart poster templates and filters by category', () => {
  const allTemplates = imageDesignService.getPicsartTemplates();
  assert.ok(Array.isArray(allTemplates));
  assert.ok(allTemplates.length >= 30);

  const fashionTemplates = imageDesignService.getPicsartTemplates('fashion');
  assert.ok(fashionTemplates.length > 0);
  assert.ok(fashionTemplates.every(t => t.category === 'fashion'));

  const catalog = imageDesignService.getCatalog();
  assert.ok(Array.isArray(catalog.templates));
  assert.equal(catalog.templates.length, allTemplates.length);
});

test('image design service matches best template for product brief and assigns backdrop to variant', () => {
  const result = imageDesignService.matchTemplateForProduct('Giày sneaker thể thao phong cách đường phố');
  assert.equal(result.categoryMatch, 'fashion');
  assert.ok(result.template);
  assert.ok(result.template.localPath.includes('shoe') || result.template.category === 'fashion');

  const [variant] = imageDesignService.createDesignSet({
    brief: 'Giày sneaker thể thao phong cách đường phố',
    variantCount: 1
  });
  assert.ok(variant.template);
  assert.ok(variant.templateUrl);
  assert.equal(variant.canvas.background.type, 'template');
  assert.equal(variant.canvas.backdrop, variant.templateUrl);
});


