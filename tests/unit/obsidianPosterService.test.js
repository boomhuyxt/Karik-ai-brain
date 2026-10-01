const test = require('node:test');
const assert = require('node:assert/strict');
const obsidianPosterService = require('../../src/services/image/obsidianPoster.service');
const imageDesignService = require('../../src/services/image/imageDesign.service');
const imageController = require('../../src/controllers/image.controller');

test('Obsidian Poster Service exposes all 24 trained backdrops across 3 categories', () => {
  const all = obsidianPosterService.getBackdrops();
  assert.equal(all.length, 24);

  const artBackdrops = obsidianPosterService.getBackdrops('art');
  const memeBackdrops = obsidianPosterService.getBackdrops('meme');
  const xeBackdrops = obsidianPosterService.getBackdrops('xe');

  assert.equal(artBackdrops.length, 8);
  assert.equal(memeBackdrops.length, 8);
  assert.equal(xeBackdrops.length, 8);

  assert.ok(all.every(b => b.id && b.title && b.path && b.safeZone && b.recommendedColors && b.recommendedFonts));
  assert.ok(all.every(b => b.url.startsWith('/api/github/raw?path=')));
});

test('Obsidian Poster Service retrieves backdrop by ID with exact specifications', () => {
  const xe01 = obsidianPosterService.getBackdropById('XE-01');
  assert.ok(xe01);
  assert.equal(xe01.title, 'Thép Gân Nhám Kim Cương (Diamond Plate)');
  assert.equal(xe01.category, 'xe');
  assert.equal(xe01.recommendedColors.text, '#FACC15');
  assert.ok(xe01.aiPrompt.includes('diamond plate steel sheet'));

  const xe02 = obsidianPosterService.getBackdropById('XE-02');
  assert.ok(xe02);
  assert.equal(xe02.title, 'Phông Vải Xếp Nếp Studio Đen');
  assert.equal(xe02.recommendedColors.text, '#FFFFFF');
  assert.equal(xe02.recommendedColors.accent, '#CA8A04');

  const meme05 = obsidianPosterService.getBackdropById('MEME-05');
  assert.ok(meme05);
  assert.equal(meme05.aspectRatio, '4:5');
  assert.ok(meme05.keywords.includes('so sánh'));
});

test('Obsidian Poster Service matches backdrop intelligently based on domain and brief', () => {
  // Test automotive oil product
  const oilMatch = obsidianPosterService.matchBackdrop('Poster quảng cáo dòng sản phẩm dầu nhớt cao cấp mới về shop');
  assert.ok(oilMatch.backdrop);
  assert.ok(['XE-01', 'XE-02', 'ART-04'].includes(oilMatch.backdrop.id));

  // Test comparison meme
  const memeMatch = obsidianPosterService.matchBackdrop('Poster so sánh sai lầm khi chọn nhớt giả vs nhớt chính hãng');
  assert.ok(memeMatch.backdrop);
  assert.equal(memeMatch.backdrop.id, 'MEME-05');

  // Test emergency hotline
  const hotlineMatch = obsidianPosterService.matchBackdrop('Thông báo hotline cứu hộ xe khẩn cấp 24/7 bảo hành tận nơi');
  assert.ok(hotlineMatch.backdrop);
  assert.equal(hotlineMatch.backdrop.id, 'MEME-03');

  // Test racing speed
  const raceMatch = obsidianPosterService.matchBackdrop('Sự kiện đua xe sportbike tốc độ bứt tốc');
  assert.ok(raceMatch.backdrop);
  assert.ok(['ART-05', 'XE-03', 'XE-04'].includes(raceMatch.backdrop.id));
});

test('buildPosterConfig produces valid schema 3.0 poster-config with Obsidian 5-step rules', () => {
  const backdrop = obsidianPosterService.getBackdropById('XE-02');
  const config = obsidianPosterService.buildPosterConfig({
    backdrop,
    brief: 'Poster bán nhớt Castrol cao cấp',
    copy: {
      title: 'BỨT PHÁ MÃ LỰC',
      subtitle: 'Dầu nhớt chính hãng thế hệ mới',
      badge: 'MỚI VỀ HÀNG',
      cta: 'MUA NGAY'
    },
    productImageUrl: 'https://example.com/castrol.png'
  });

  assert.equal(config.schemaVersion, '3.0');
  assert.equal(config.source, 'obsidian_vault');
  assert.equal(config.backdropId, 'XE-02');
  assert.equal(config.title, 'BỨT PHÁ MÃ LỰC');
  assert.ok(config.canvas.background.url.includes('raw/n%E1%BB%81n%20poster/xe/'));
  assert.ok(config.layers.length >= 7);

  const productLayer = config.layers.find(l => l.id === 'main_subject');
  assert.ok(productLayer);
  assert.equal(productLayer.url, 'https://example.com/castrol.png');
  assert.equal(productLayer.removeBackground, true);

  const headlineLayer = config.layers.find(l => l.id === 'headline');
  assert.ok(headlineLayer);
  assert.equal(headlineLayer.text, 'BỨT PHÁ MÃ LỰC');

  const ctaLayer = config.layers.find(l => l.id === 'cta_label');
  assert.ok(ctaLayer);
  assert.equal(ctaLayer.text, 'MUA NGAY');
});

test('imageDesignService integrates Obsidian backdrops and reflects in catalog', () => {
  const catalog = imageDesignService.getCatalog();
  assert.ok(Array.isArray(catalog.obsidianBackdrops));
  assert.equal(catalog.obsidianBackdrops.length, 24);

  // Automotive brief gets matched with Obsidian backdrop
  const matchResult = imageDesignService.matchTemplateForProduct('Ra mắt sản phẩm nhớt xe máy nhập khẩu cao cấp');
  assert.equal(matchResult.source, 'obsidian');
  assert.ok(matchResult.template);
  assert.ok(matchResult.template.id.startsWith('XE-'));

  // Variant created with automotive brief uses Obsidian art direction
  const variants = imageDesignService.createDesignSet({
    brief: 'Ra mắt sản phẩm nhớt xe máy nhập khẩu cao cấp',
    variantCount: 1
  });
  assert.equal(variants.length, 1);
  assert.ok(variants[0].artDirection.includes('Obsidian'));
  assert.ok(variants[0].templateUrl.includes('/api/github/raw?path='));
});

test('imageController handles Obsidian template endpoints', () => {
  let jsonResult = null;
  const mockRes = {
    json: (data) => { jsonResult = data; return data; }
  };

  // 1. getObsidianTemplates
  imageController.getObsidianTemplates({ query: { category: 'xe' } }, mockRes);
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.count, 8);

  // 2. matchObsidianTemplate
  imageController.matchObsidianTemplate({ body: { brief: 'dầu nhớt xe' } }, mockRes);
  assert.equal(jsonResult.success, true);
  assert.ok(jsonResult.backdrop);

  // 3. createObsidianPoster
  imageController.createObsidianPoster({
    body: {
      backdropId: 'XE-01',
      brief: 'Bảng giá bảo dưỡng xe',
      copy: { title: 'BẢNG GIÁ DỊCH VỤ' }
    }
  }, mockRes);
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.posterConfig.backdropId, 'XE-01');
  assert.equal(jsonResult.posterConfig.title, 'BẢNG GIÁ DỊCH VỤ');
});
