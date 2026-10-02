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

  // 4. getTechniques
  imageController.getTechniques({}, mockRes);
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.count, 10);
  assert.ok(jsonResult.techniques.length === 10);
});

test('Obsidian Poster Service exposes all 10 Poster Design Techniques with valid configurations', () => {
  const techniques = obsidianPosterService.getTechniques();
  assert.equal(techniques.length, 10);

  // All 10 techniques have mandatory properties
  assert.ok(techniques.every(t =>
    t.id &&
    t.name &&
    t.slug &&
    t.category &&
    t.coreEssence &&
    Array.isArray(t.recommendedLayouts) &&
    t.recommendedFonts?.headline &&
    t.recommendedFonts?.body &&
    Array.isArray(t.recommendedAspectRatios) &&
    Array.isArray(t.recommendedBackdropIds) &&
    t.colorStrategy
  ));

  // Verify specific techniques
  const tech01 = obsidianPosterService.getTechniqueById('TECH-01');
  assert.ok(tech01);
  assert.equal(tech01.slug, 'image_collage_layering');
  assert.equal(tech01.recommendedFonts.headline, 'Oswald');
  assert.ok(tech01.recommendedBackdropIds.includes('XE-01'));

  const tech04 = obsidianPosterService.getTechniqueById('TECH-04');
  assert.ok(tech04);
  assert.equal(tech04.category, 'minimalism');
  assert.equal(tech04.recommendedFonts.headline, 'Playfair Display');
  assert.ok(tech04.recommendedBackdropIds.includes('XE-02'));

  const tech06 = obsidianPosterService.getTechniqueById('TECH-06');
  assert.ok(tech06);
  assert.equal(tech06.recommendedFonts.headline, 'Orbitron');
  assert.ok(tech06.recommendedBackdropIds.includes('MEME-08'));
});

test('Obsidian Poster Service intelligently matches techniques and builds configs with custom aspect ratios', () => {
  // Test technique matching
  const matchedTech = obsidianPosterService.matchTechnique('Poster tối giản sang trọng cho thương hiệu đồng hồ cao cấp');
  assert.ok(matchedTech);
  assert.equal(matchedTech.id, 'TECH-04');

  // Test config generation with 2:3 print aspect ratio and technique font pairing
  const config = obsidianPosterService.buildPosterConfig({
    backdrop: obsidianPosterService.getBackdropById('XE-02'),
    brief: 'Poster triển lãm xe cổ điển',
    copy: { title: 'TRIỂN LÃM VINTAGE' },
    options: {
      aspectRatio: '2:3',
      techniqueId: 'TECH-05'
    }
  });

  assert.equal(config.preset, '2:3');
  assert.equal(config.canvas.width, 1200);
  assert.equal(config.canvas.height, 1800);
  assert.ok(config.technique);
  assert.equal(config.technique.id, 'TECH-05');
  assert.equal(config.technique.recommendedFonts.headline, 'Abril Fatface');

  const headlineLayer = config.layers.find(l => l.id === 'headline');
  assert.ok(headlineLayer);
  assert.equal(headlineLayer.fontFamily, 'Abril Fatface');
});

test('buildPosterConfig applies Obsidian Color Vault (60-30-10), derives product-centric headline, enlarges product and bans circles behind product', () => {
  const config = obsidianPosterService.buildPosterConfig({
    backdrop: obsidianPosterService.getBackdropById('XE-02'),
    brief: 'Poster bán sản phẩm nhớt Motul 300V cho xe phân khối lớn',
    options: {
      aspectRatio: '4:5'
    }
  });

  // 1. Color vault harmony 60-30-10 check
  assert.ok(config.paletteId);
  assert.ok(config.paletteRules);
  assert.ok(config.paletteRules.rule60 && config.paletteRules.rule30 && config.paletteRules.rule10);
  assert.ok(['racing_gold', 'motul_crimson'].includes(config.paletteId));

  // 2. Product-centric headline check
  assert.ok(config.title.toUpperCase().includes('MOTUL') || config.title.toUpperCase().includes('NHỚT'));
  const headlineLayer = config.layers.find(l => l.id === 'headline');
  assert.ok(headlineLayer.text.toUpperCase().includes('MOTUL') || headlineLayer.text.toUpperCase().includes('NHỚT'));

  // 3. Hero product scale check (enlarged width >= 80, height >= 65)
  const productLayer = config.layers.find(l => l.id === 'main_subject');
  assert.ok(productLayer);
  assert.ok(productLayer.width >= 80, `Expected product width >= 80, got ${productLayer.width}`);
  assert.ok(productLayer.height >= 65, `Expected product height >= 65, got ${productLayer.height}`);

  // 4. Ban circles behind product check (No circle shape, only thin contact_shadow ellipse at floor)
  const circularLayers = config.layers.filter(l => l.shape === 'circle');
  assert.equal(circularLayers.length, 0, 'No circular shapes allowed');
  
  const shadowLayer = config.layers.find(l => l.id === 'contact_shadow');
  assert.ok(shadowLayer);
  assert.equal(shadowLayer.shape, 'ellipse');
  assert.ok(shadowLayer.height <= 5, 'Contact shadow must be flat ground ellipse, not backlight disk');
});

test('buildPosterConfig defaults to 9:16 (1080x1920), uses roundedRect with cornerRadius, and enforces headline shadow/glow', () => {
  const config = obsidianPosterService.buildPosterConfig({
    brief: 'Poster giới thiệu phụ gia nhớt bốc máy xe số',
    copy: {
      title: 'PHỤ GIA NHỚT SIÊU CẤP',
      badge: 'CÔNG NGHỆ NANO'
    }
  });

  // 1. Default aspect ratio is 9:16 (1080x1920)
  assert.equal(config.preset, '9:16');
  assert.equal(config.canvas.width, 1080);
  assert.equal(config.canvas.height, 1920);

  // 2. Headline has 86px font size and shadow/glow properties
  const headline = config.layers.find(l => l.id === 'headline');
  assert.ok(headline);
  assert.equal(headline.fontSize, 86);
  assert.ok(headline.shadow);
  assert.ok(headline.shadow.blur >= 15);
  assert.ok(headline.shadow.color.includes('rgba'));

  // 2.1 Main subject product has 50% sharpen adjustment
  const mainSubject = config.layers.find(l => l.id === 'main_subject');
  assert.ok(mainSubject);
  assert.equal(mainSubject.adjustments.sharpen, 50);

  // 2.2 Backdrop is selected from Xe & cơ khí category
  assert.ok(config.backdropId.startsWith('XE-'));

  // 3. Badge and CTA shapes use roundedRect with cornerRadius
  const badgeBg = config.layers.find(l => l.id === 'price_badge_bg' || l.id === 'badge_bg');
  assert.ok(badgeBg);
  assert.equal(badgeBg.shape, 'roundedRect');
  assert.ok(badgeBg.cornerRadius >= 12);

  const ctaBg = config.layers.find(l => l.id === 'cta_bg');
  assert.ok(ctaBg);
  assert.equal(ctaBg.shape, 'roundedRect');
  assert.ok(ctaBg.cornerRadius >= 20);

  // 4. Publishing productCaption is purely product-centric
  assert.ok(config.publishing);
  assert.ok(config.publishing.productCaption);
  assert.ok(!config.publishing.productCaption.toLowerCase().includes('layer'));
  assert.ok(!config.publishing.productCaption.toLowerCase().includes('typography'));
  assert.ok(!config.publishing.productCaption.toLowerCase().includes('bố cục'));
});

test('buildPosterConfig strictly positions headline between price badge and main product subject, and selects random Xe backdrop', () => {
  // Test getRandomXeBackdrop helper
  const randomXe = obsidianPosterService.getRandomXeBackdrop();
  assert.ok(randomXe);
  assert.equal(randomXe.category, 'xe');
  assert.ok(randomXe.id.startsWith('XE-'));

  // Test config layer stacking
  const config = obsidianPosterService.buildPosterConfig({
    brief: 'Poster bán lốp xe Michelin Pilot Street giá 650.000đ',
    copy: {
      title: 'LỐP XE MICHELIN CAO CẤP',
      badge: 'GIÁ 650.000Đ'
    }
  });

  const priceBadgeBg = config.layers.find(l => l.id === 'price_badge_bg');
  const priceBadgeText = config.layers.find(l => l.id === 'price_badge_text');
  const headline = config.layers.find(l => l.id === 'headline');
  const mainSubject = config.layers.find(l => l.id === 'main_subject');
  const productSummary = config.layers.find(l => l.id === 'product_summary');

  assert.ok(priceBadgeBg, 'Price badge background layer must exist');
  assert.ok(priceBadgeText, 'Price badge text layer must exist');
  assert.ok(headline, 'Headline layer must exist');
  assert.ok(mainSubject, 'Main subject product layer must exist');
  assert.ok(productSummary, 'Product summary layer below product image must exist');

  // Strict vertical hierarchy: Price Badge -> Headline -> Product Image -> Product Summary
  assert.ok(priceBadgeBg.y < headline.y, `Price badge Y (${priceBadgeBg.y}) must be above Headline Y (${headline.y})`);
  assert.ok(headline.y < mainSubject.y, `Headline Y (${headline.y}) must be above Main Subject Y (${mainSubject.y})`);
  assert.ok(mainSubject.y < productSummary.y, `Main Subject Y (${mainSubject.y}) must be above Product Summary Y (${productSummary.y})`);

  // Price text must be strictly greater than 30px and prominent
  assert.ok(priceBadgeText.fontSize > 30, `Price badge font size (${priceBadgeText.fontSize}) must be > 30px`);
  assert.equal(priceBadgeText.fontSize, 34);

  // Price badge shape must have border >= 3px and 3D shadow
  assert.ok(priceBadgeBg.stroke, 'Price badge shape must have a stroke border');
  assert.ok(priceBadgeBg.strokeWidth >= 3, `Price badge strokeWidth (${priceBadgeBg.strokeWidth}) must be >= 3px`);
  assert.ok(priceBadgeBg.shadow, 'Price badge shape must have shadow to stand out');

  // Headline specifications
  assert.equal(headline.fontSize, 86);
  assert.ok(headline.shadow);
  assert.ok(headline.shadow.blur >= 15);

  // Main subject 50% sharpen
  assert.equal(mainSubject.adjustments.sharpen, 50);

  // Backdrop must be from category 'xe'
  assert.ok(config.backdropId.startsWith('XE-'));
  const backdrop = obsidianPosterService.getBackdropById(config.backdropId);
  assert.equal(backdrop.category, 'xe');
});

test('buildPosterConfig extracts user-provided product name and price into headline and price badge', () => {
  const config = obsidianPosterService.buildPosterConfig({
    brief: 'Tên sản phẩm: Nhớt Wolver Racing Special 10W40, Giá: 250.000đ'
  });

  assert.equal(config.title, 'Nhớt Wolver Racing Special 10W40');
  assert.equal(config.productName, 'Nhớt Wolver Racing Special 10W40');
  assert.ok(config.price.includes('250.000Đ') || config.price.includes('250.000đ'));

  const headline = config.layers.find(l => l.id === 'headline');
  const priceBadgeText = config.layers.find(l => l.id === 'price_badge_text');
  const priceBadgeBg = config.layers.find(l => l.id === 'price_badge_bg');

  assert.ok(headline);
  assert.equal(headline.text, 'NHỚT WOLVER RACING SPECIAL 10W40');

  assert.ok(priceBadgeText);
  assert.ok(priceBadgeText.text.includes('250.000Đ'));
  assert.ok(priceBadgeText.fontSize >= 34);

  assert.ok(priceBadgeBg);
  assert.ok(priceBadgeBg.strokeWidth >= 3);
});

test('deriveProductHeadline extracts exact product name from various user prompt formats even without "cho"', () => {
  // Case 1: Prompt without 'cho', with price and promotional verbs
  const p1 = obsidianPosterService.deriveProductHeadline('tạo ảnh poster quảng cáo Dung dịch vệ sinh buồng đốt Yamaha giá 75.000đ');
  assert.equal(p1, 'Dung dịch vệ sinh buồng đốt Yamaha');

  // Case 2: Short prompt without 'cho'
  const p2 = obsidianPosterService.deriveProductHeadline('tạo poster Nhớt Motul 300V');
  assert.equal(p2, 'Nhớt Motul 300V');

  // Case 3: Prompt with 'làm poster'
  const p3 = obsidianPosterService.deriveProductHeadline('làm poster Bugi Denso Iridium');
  assert.equal(p3, 'Bugi Denso Iridium');

  // Case 4: Prompt with 'cho'
  const p4 = obsidianPosterService.deriveProductHeadline('thiết kế poster cho Vỏ Michelin Pilot Street 2');
  assert.equal(p4, 'Vỏ Michelin Pilot Street 2');

  // Case 5: Prompt starting with 'tôi ảnh poster quảng cáo' (user's exact bug report)
  const p5 = obsidianPosterService.deriveProductHeadline('tôi ảnh poster quảng cáo Dung dịch buồng đốt Yamaha giá 75.000đ');
  assert.equal(p5, 'Dung dịch buồng đốt Yamaha');

  // Case 6: Prompt starting with 'tôi muốn làm ảnh poster quảng cáo'
  const p6 = obsidianPosterService.deriveProductHeadline('tôi muốn làm ảnh poster quảng cáo Nhớt Motul 300V');
  assert.equal(p6, 'Nhớt Motul 300V');

  // Case 7: Dirty copy/title from Gemini containing 'TÔI ẢNH POSTER QUẢNG CÁO...'
  const p7 = obsidianPosterService.deriveProductHeadline('', { title: 'TÔI ẢNH POSTER QUẢNG CÁO DUNG DỊCH VỆ SINH BUỒNG ĐỐT YAMAHA' });
  assert.equal(p7, 'DUNG DỊCH VỆ SINH BUỒNG ĐỐT YAMAHA');

  // Case 8: Conversational request from customer
  const p8 = obsidianPosterService.deriveProductHeadline('Em nhờ shop tạo poster quảng cáo cho Lốp xe Michelin City Extra');
  assert.equal(p8, 'Lốp xe Michelin City Extra');
});

test('buildPosterConfig extracts only pure product name for headline even when user starts prompt with "tôi ảnh poster quảng cáo"', () => {
  const config = obsidianPosterService.buildPosterConfig({
    brief: 'tôi ảnh poster quảng cáo Dung dịch vệ sinh buồng đốt Yamaha giá 75.000đ'
  });

  const headline = config.layers.find(l => l.id === 'headline');
  assert.ok(headline);
  assert.equal(headline.text, 'DUNG DỊCH VỆ SINH BUỒNG ĐỐT YAMAHA');
  assert.ok(!headline.text.includes('TÔI'));
  assert.ok(!headline.text.includes('POSTER'));
  assert.ok(!headline.text.includes('QUẢNG CÁO'));
});


test('buildPosterConfig selects random Xe backdrop from XE-01 to XE-08 when no backdrop is specified', () => {
  const xeIds = new Set(['XE-01', 'XE-02', 'XE-03', 'XE-04', 'XE-05', 'XE-06', 'XE-07', 'XE-08']);
  for (let i = 0; i < 20; i++) {
    const config = obsidianPosterService.buildPosterConfig({
      brief: 'tạo poster Dung dịch vệ sinh buồng đốt Yamaha'
    });
    assert.ok(xeIds.has(config.backdropId), `Backdrop ${config.backdropId} must be in Xe category`);
    assert.ok(config.canvas.background.url.includes('raw/n%E1%BB%81n%20poster/xe/'));
    const headline = config.layers.find(l => l.id === 'headline');
    assert.ok(headline);
    assert.equal(headline.text, 'DUNG DỊCH VỆ SINH BUỒNG ĐỐT YAMAHA');
  }
});

