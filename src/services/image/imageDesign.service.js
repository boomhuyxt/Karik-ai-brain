const STYLES = [
  ['editorial_luxury', 'Editorial Luxury', ['sang trọng', 'premium', 'fashion', 'beauty'], ['Playfair Display', 'Inter'], 'refined editorial photography, premium materials, generous negative space'],
  ['neo_brutalism', 'Neo Brutalism', ['táo bạo', 'trẻ', 'event', 'music'], ['Montserrat', 'Inter'], 'raw geometric blocks, oversized type zones, sharp visual tension'],
  ['organic_minimal', 'Organic Minimal', ['tự nhiên', 'wellness', 'food', 'spa'], ['Be Vietnam Pro', 'Inter'], 'soft daylight, tactile natural materials, calm breathing room'],
  ['kinetic_sport', 'Kinetic Sport', ['năng lượng', 'sport', 'fitness', 'automotive'], ['Oswald', 'Inter'], 'dynamic diagonal energy, motion trails, dramatic directional light'],
  ['retro_future', 'Retro Future', ['hoài cổ', 'gaming', 'music', 'technology'], ['Montserrat', 'Inter'], 'retro-futurist forms, analog grain, dimensional lighting'],
  ['swiss_grid', 'Swiss Grid', ['chuyên nghiệp', 'business', 'education', 'architecture'], ['Inter', 'Be Vietnam Pro'], 'precise modernist grid, objective photography, disciplined whitespace'],
  ['cinematic_noir', 'Cinematic Noir', ['bí ẩn', 'kịch tính', 'film', 'automotive'], ['Playfair Display', 'Inter'], 'cinematic low-key lighting, deep shadows, atmospheric depth'],
  ['y2k_chrome', 'Y2K Chrome', ['tương lai', 'gaming', 'music', 'fashion'], ['Montserrat', 'Inter'], 'liquid chrome, translucent surfaces, electric studio lighting'],
  ['paper_collage', 'Paper Collage', ['thủ công', 'sáng tạo', 'travel', 'education'], ['Be Vietnam Pro', 'Inter'], 'layered paper cutouts, tactile edges, editorial collage'],
  ['soft_3d', 'Soft 3D', ['dễ thương', 'app', 'family', 'service'], ['Be Vietnam Pro', 'Inter'], 'soft 3D forms, rounded materials, playful polished lighting'],
  ['heritage_craft', 'Heritage Craft', ['truyền thống', 'coffee', 'food', 'craft'], ['Playfair Display', 'Be Vietnam Pro'], 'heritage materials, warm documentary light, authentic craft detail'],
  ['data_futurism', 'Data Futurism', ['công nghệ', 'ai', 'finance', 'business'], ['Montserrat', 'Inter'], 'luminous data forms, spatial depth, premium tech realism']
].map(([id, label, keywords, fonts, treatment]) => ({ id, label, keywords, fonts, treatment }));

const obsidianColorService = require('./obsidianColor.service');

const OBSIDIAN_PALETTES = [
  ['racing_gold', '#0B0F19', '#334155', '#FFD700', '#FFFFFF', '#FDE047'],
  ['motul_crimson', '#111827', '#94A3B8', '#DC143C', '#FFFFFF', '#F87171'],
  ['cyber_cyan', '#07111F', '#6366F1', '#00FFFF', '#FFFFFF', '#38BDF8'],
  ['sunset_amber', '#18120C', '#78350F', '#F59E0B', '#FFFBEB', '#FCD34D'],
  ['emerald_racing', '#052E16', '#0D9488', '#22C55E', '#F0FDF4', '#86EFAC'],
  ['royal_luxury', '#0A1128', '#1C3D5A', '#FACC15', '#F8FAFC', '#93C5FD'],
  ['monochrome_silver', '#0A0A0A', '#475569', '#F1F5F9', '#FFFFFF', '#CBD5E1'],
  ['fresh_minimalist', '#F8F9F5', '#4A6B53', '#1C3323', '#1C3323', '#4A6B53']
];

const LEGACY_PALETTES = [
  ['ink_cyan', '#07111F', '#12304A', '#36D9FF', '#F7FBFF', '#A8C1D1'],
  ['sand_ink', '#F3EBDD', '#D8C5A5', '#27231F', '#27231F', '#665E54'],
  ['forest_clay', '#102A23', '#B76545', '#E9DCC9', '#FFF9EF', '#D7C9B6'],
  ['violet_lime', '#211038', '#7135A8', '#D8FF57', '#FFFFFF', '#D7C6E8'],
  ['cobalt_orange', '#071B54', '#1955D6', '#FF6B2C', '#FFFFFF', '#C9D8FF'],
  ['cherry_cream', '#4A0E20', '#D43A5B', '#FFF0DB', '#FFF8ED', '#F1C5C9'],
  ['mono_red', '#101010', '#E8E5DF', '#FF3B30', '#FFFFFF', '#CACACA'],
  ['sage_sky', '#E9F0E5', '#A7C7B5', '#3978A8', '#17342C', '#4D665E'],
  ['plum_gold', '#24101F', '#6A334F', '#DDBB67', '#FFF8EA', '#DEC9D3'],
  ['sunset_teal', '#0B3B3C', '#F27B5B', '#FFD66B', '#FFFFFF', '#CDE7E2']
];

const PALETTES = [...OBSIDIAN_PALETTES, ...LEGACY_PALETTES].map(([id, background, secondary, accent, text, subtext]) => ({
  id,
  colors: [background, secondary, accent],
  text,
  subtext
}));

const LAYOUTS = ['editorial_split', 'hero_center', 'diagonal_motion', 'frame_within_frame', 'asymmetric_grid', 'bottom_stage'];
const SIZES = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], '16:9': [1920, 1080], '2:3': [1200, 1800] };

function cleanText(value, fallback = '', maxLength = 300) {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength) || fallback;
}

function cleanList(value, maxItems = 6) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => cleanText(item, '', 40)).filter(Boolean))].slice(0, maxItems);
}

function normalizePreferences(value = {}) {
  return {
    preferredStyles: cleanList(value.preferredStyles),
    avoidedStyles: cleanList(value.avoidedStyles),
    brandColors: cleanList(value.brandColors, 4).filter(color => /^#[0-9a-f]{6}$/i.test(color)),
    mood: cleanText(value.mood, '', 80),
    audience: cleanText(value.audience, '', 120),
    industry: cleanText(value.industry, '', 80).toLowerCase(),
    fontPersonality: cleanText(value.fontPersonality, '', 80),
    density: ['airy', 'balanced', 'dense'].includes(value.density) ? value.density : 'balanced'
  };
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).map(item => ({
    style: cleanText(item?.style, '', 40),
    layout: cleanText(item?.layout, '', 40),
    palette: cleanText(item?.palette, '', 40)
  }));
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotate(items, seed) {
  const offset = seed % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
}

function chooseStyles(brief, preferences, history, count) {
  const context = `${brief} ${preferences.mood} ${preferences.industry}`.toLowerCase();
  const recent = history.map(item => item.style);
  return rotate(STYLES, hashString(context))
    .map(style => {
      let score = style.keywords.reduce((sum, keyword) => sum + (context.includes(keyword) ? 3 : 0), 0);
      if (preferences.preferredStyles.includes(style.id)) score += 8;
      if (preferences.avoidedStyles.includes(style.id)) score -= 100;
      score -= recent.filter(id => id === style.id).length * 7;
      return { style, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(item => item.style);
}

function chooseUnused(items, used, seed) {
  return rotate(items, seed).find(item => !used.has(item.id || item)) || rotate(items, seed)[0];
}

function buildKeyVisualPrompt({ brief, audience, style, palette, layout, aspectRatio }) {
  return [
    'Use case: ads-marketing',
    `Asset type: editable hybrid poster key visual, ${aspectRatio}`,
    `Primary request: ${brief}`,
    `Audience: ${audience || 'general target audience'}`,
    `Style/medium: ${style.label}; ${style.treatment}`,
    `Composition/framing: ${layout.replace(/_/g, ' ')}; asymmetric campaign composition with one intentional clean zone for editable typography`,
    `Color palette: ${palette.colors.join(', ')}`,
    'Text: none',
    'Lighting/materials: controlled commercial lighting, believable tactile materials, precise edges, dimensional separation from background',
    'Constraints: create only background and one relevant key visual; preserve realistic product proportions; polished art-directed campaign quality',
    'Avoid: words, letters, numbers, logos, watermarks, UI, fake text, generic abstract chrome sculpture, centered stock composition, giant flat circle, clutter'
  ].join('\n');
}

function createLayers(layout, palette, style, copy) {
  const [background, secondary, accent] = palette.colors;
  const compositions = {
    editorial_split: { subject: [68, 54, 76, 70], text: [7, 14, 46, 'left'], cta: [7, 86, 'left'] },
    hero_center: { subject: [50, 54, 86, 68], text: [8, 9, 84, 'center'], cta: [50, 88, 'center'] },
    diagonal_motion: { subject: [62, 54, 82, 70], text: [7, 12, 50, 'left'], cta: [7, 86, 'left'] },
    frame_within_frame: { subject: [50, 54, 85, 68], text: [8, 10, 84, 'center'], cta: [50, 88, 'center'] },
    asymmetric_grid: { subject: [38, 54, 76, 70], text: [56, 14, 38, 'left'], cta: [56, 84, 'left'] },
    bottom_stage: { subject: [50, 40, 86, 66], text: [8, 66, 84, 'center'], cta: [50, 90, 'center'] }
  };
  const c = compositions[layout] || compositions.hero_center;
  const [subjectX, subjectY, subjectW, subjectH] = c.subject;
  const [textX, textY, textW, textAlign] = c.text;
  const [ctaX, ctaY, ctaAlign] = c.cta;
  const ctaCenter = ctaAlign === 'left' ? ctaX + 13 : ctaX;

  // Cấu trúc Layer chuẩn:
  // 1. Bỏ triệt để các hình tròn / aura ở đằng sau sản phẩm (no backlight glow circle)
  // 2. Phóng to sản phẩm lên tối đa (86% x 68%) để sản phẩm nổi bật nhất poster
  // 3. Khẩu hiệu dòng sản phẩm, Tên sản phẩm to rõ liên quan trực tiếp, Tác dụng công năng rõ ràng
  return [
    // 1. Mặt nạ chuyển sắc làm dịu nền phía trên đảm bảo chữ đọc rõ ràng tuyệt đối
    { id: 'gradient_scrim', type: 'shape', shape: 'rect', x: 50, y: 18, width: 100, height: 36, fill: '#000000', opacity: 0.32 },
    // 2. Bóng tiếp đất chân thực dưới đáy sản phẩm (Contact Shadow - điểm tiếp xúc mặt sàn, không phải hình tròn sau lưng)
    { id: 'contact_shadow', type: 'shape', shape: 'ellipse', x: subjectX, y: subjectY + (subjectH / 2) - 1.5, width: subjectW * 0.70, height: 3.5, fill: '#000000', opacity: 0.58 },
    // 3. Sản phẩm chính phóng to tối đa, chiếm vị trí trung tâm, chỉ cần tách nền
    { id: 'main_subject', type: 'image', x: subjectX, y: subjectY, width: subjectW, height: subjectH, fit: 'contain', removeBackground: true },
    // 4. Khung Khẩu hiệu dòng sản phẩm (Badge Pill)
    { id: 'badge_bg', type: 'shape', shape: 'roundedRect', x: textX, y: textY, width: Math.min(textW, 36), height: 4.6, fill: accent, cornerRadius: 8 },
    // 5. Khẩu hiệu dòng sản phẩm (Line Slogan / Eyebrow)
    { id: 'eyebrow', type: 'text', text: copy.eyebrow, x: textX, y: textY, width: Math.min(textW, 36), height: 4.6, align: textAlign, fontFamily: style.fonts[0], fontWeight: 800, fontSize: 16, charSpacing: 40, color: background },
    // 6. Tên sản phẩm to, rõ ràng, đậm nét, liên quan trực tiếp đến sản phẩm (Product Headline)
    { id: 'headline', type: 'text', text: copy.title, x: textX, y: textY + 9, width: textW, height: 16, align: textAlign, fontFamily: style.fonts[0], fontWeight: 900, fontSize: 62, minFontSize: 34, lineHeight: 0.96, color: palette.text },
    // 7. Tác dụng & công năng của sản phẩm (Product Benefits / Subtext)
    { id: 'subtext', type: 'text', text: copy.subtitle, x: textX, y: textY + 23, width: Math.min(textW + 15, 84), height: 8, align: textAlign, fontFamily: style.fonts[1], fontWeight: 600, fontSize: 20, minFontSize: 14, lineHeight: 1.3, color: accent },
    // 8. Điểm nhấn công năng và tính năng chi tiết
    { id: 'feature_bar', type: 'text', text: '⚡ Chính Hãng 100%  •  🔥 Hiệu Năng Vượt Trội  •  🛡️ Bảo Vệ Tối Ưu', x: ctaCenter, y: ctaY - 6.5, width: Math.min(textW + 30, 88), height: 3.5, align: 'center', fontFamily: style.fonts[1], fontWeight: 500, fontSize: 15, color: '#E2E8F0' },
    // 9. Nút Kêu Gọi Hành Động (CTA Button)
    { id: 'cta_bg', type: 'shape', shape: 'roundedRect', x: ctaCenter, y: ctaY, width: 28, height: 5.6, fill: accent, cornerRadius: 16 },
    // 10. Chữ nút CTA
    { id: 'cta_text', type: 'text', text: copy.cta, x: ctaCenter, y: ctaY, width: 24, height: 3.8, align: 'center', fontFamily: style.fonts[0], fontWeight: 800, fontSize: 17, minFontSize: 13, color: background }
  ];
}

function deriveHeadline(brief, copy = {}, preferences = {}) {
  if (copy.title && copy.title.trim()) return cleanText(copy.title, '', 54);
  if (copy.productName && copy.productName.trim()) return cleanText(copy.productName, '', 54);
  if (preferences.productName && preferences.productName.trim()) return cleanText(preferences.productName, '', 54);

  const raw = cleanText(brief, 'SẢN PHẨM MỚI', 180).split(/[.!?;:\n]/)[0];

  // Remove command prefixes
  let cleaned = raw
    .replace(/^(hãy\s+)?(thiết kế|tạo|làm|vẽ|lên ý tưởng)\s+(một\s+)?/i, '')
    .replace(/^(một\s+)?(poster|banner|ảnh|hình ảnh|ấn phẩm)\s+(quảng cáo\s+)?/i, '')
    .replace(/^(giới thiệu|ra mắt|quảng bá|chào đón|bán|ưu đãi|sale)\s+/i, '')
    .trim();

  // Extract core product subject before prepositions like "cho", "dành cho"
  const parts = cleaned.split(/\s+(?:dành\s+)?cho\s+/i);
  if (parts.length > 1 && parts[0].trim().length >= 4) {
    const candidate = parts[0].trim().split(/\s+/).slice(0, 6).join(' ');
    if (candidate.length >= 3) {
      return cleanText(candidate, 'SẢN PHẨM CAO CẤP', 54);
    }
  }

  // Omit generic command / category noise words
  const words = cleaned.split(/\s+/).filter(Boolean);
  const filteredWords = words.filter(w => !/^(hãy|thiết|kế|tạo|làm|một|poster|ảnh|banner|quảng|cáo)$/i.test(w));
  const candidate = (filteredWords.length > 0 ? filteredWords : words).slice(0, 6).join(' ');
  return cleanText(candidate, 'SẢN PHẨM CHÍNH HÃNG', 54);
}

function deriveProductSubtitle(brief, preferences = {}) {
  const text = `${brief || ''} ${preferences.industry || ''}`.toLowerCase();
  if (/(?:nhớt|dầu nhớt|motul|castrol|bôi trơn)/i.test(text)) {
    return 'Tối ưu hóa công suất động cơ • Bôi trơn bền bỉ • Giảm nhiệt tức thì';
  }
  if (/(?:mũ|nón|bảo hộ|giáp|găng|alpinestars)/i.test(text)) {
    return 'Bảo vệ chuẩn an toàn quốc tế • Thiết kế khí động học • Êm ái đường dài';
  }
  if (/(?:xe|độ xe|biker|harley|racing|phụ tùng|pô|bugi)/i.test(text)) {
    return 'Đạt chuẩn kỹ thuật đua • Bứt phá tốc độ • Độ bền bỉ tối đa';
  }
  if (/(?:cà phê|coffee|trà|ẩm thực|nước)/i.test(text)) {
    return 'Hương vị nguyên bản • Tinh tuyển thủ công • Nguồn năng lượng tươi mới';
  }
  if (/(?:công nghệ|tech|app|ai|phần mềm|điện tử)/i.test(text)) {
    return 'Đột phá hiệu năng • Trải nghiệm thông minh • Dẫn đầu xu thế';
  }
  return `Thiết kế tối ưu cho ${preferences.audience || 'khách hàng mục tiêu'}`;
}

const CATEGORY_RULES = [
  {
    category: 'fashion_shoes',
    keywords: ['giày', 'shoe', 'shoes', 'boot', 'boots', 'sneaker', 'sneakers', 'sandal', 'guốc', 'dép', 'footwear', 'dép lào'],
    preferredSubstrings: ['shoe', 'boot', 'footwear']
  },
  {
    category: 'fashion_clothes',
    keywords: ['áo', 'quần', 'váy', 'đầm', 'thời trang', 'fashion', 'hoodie', 'jacket', 'shirt', 'dress', 'suit', 'vest', 'collection', 'polo'],
    preferredSubstrings: ['fashion', 'collection', 'mens']
  },
  {
    category: 'fashion_hats',
    keywords: ['mũ', 'nón', 'hat', 'hats', 'cap', 'beanie', 'phụ kiện', 'accessory'],
    preferredSubstrings: ['hat']
  },
  {
    category: 'sale',
    keywords: ['sale', 'giảm giá', 'khuyến mãi', 'ưu đãi', 'hot deal', 'black friday', 'deal', 'discount', 'flash sale', 'xả kho', 'giá sốc', 'sale 50%'],
    preferredSubstrings: ['sale', 'black_friday', 'anniversary']
  },
  {
    category: 'food_beverage',
    keywords: ['cà phê', 'coffee', 'trà', 'tea', 'bánh', 'đồ ăn', 'food', 'nước uống', 'beverage', 'cafe', 'quán ăn', 'ẩm thực', 'organic', 'sạch', 'nhà hàng'],
    preferredSubstrings: ['earthy', 'fashion_poster_with_beige', 'summer_sale_poster_in_brown']
  },
  {
    category: 'travel',
    keywords: ['du lịch', 'travel', 'tour', 'khách sạn', 'hotel', 'resort', 'vé máy bay', 'nghỉ dưỡng', 'phượt', 'khám phá', 'chuyến đi', 'đà nẵng', 'hà nội', 'phú quốc'],
    preferredSubstrings: ['travel', 'italy', 'dubai', 'arizona', 'istanbul']
  },
  {
    category: 'events',
    keywords: ['sự kiện', 'event', 'tiệc', 'party', 'sinh nhật', 'birthday', 'khai trương', 'opening', 'halloween', 'hội thảo', 'workshop', 'celebration', 'chúc mừng'],
    preferredSubstrings: ['story', 'party', 'celebration', 'halloween']
  },
  {
    category: 'tech_automotive',
    keywords: ['xe', 'xe máy', 'oto', 'phụ tùng', 'nhớt', 'bugi', 'moto', 'bike', 'motor', 'công nghệ', 'tech', 'điện thoại', 'linh kiện', 'wave'],
    preferredSubstrings: ['hero_instagram', 'anniversary_sale', 'black_friday']
  },
  {
    category: 'education',
    keywords: ['học', 'khóa học', 'sách', 'book', 'course', 'trường', 'school', 'teacher', 'giáo dục', 'education', 'lớp học', 'sinh viên'],
    preferredSubstrings: ['school', 'teacher', 'learning']
  }
];

const obsidianPosterService = require('./obsidianPoster.service');

function matchTemplateForProduct(brief, preferences = {}) {
  // 1. Explicit backdrop/template ID specified
  const targetId = preferences.backdropId || preferences.templateId;
  if (targetId) {
    const bd = obsidianPosterService.getBackdropById(targetId);
    if (bd) {
      return {
        template: { id: bd.id, title: bd.title, localPath: bd.url, category: bd.category, source: 'obsidian', safeZone: bd.safeZone, recommendedColors: bd.recommendedColors, recommendedFonts: bd.recommendedFonts },
        categoryMatch: bd.category,
        matchedKeyword: bd.id,
        source: 'obsidian'
      };
    }
  }

  // 2. Default to Obsidian Vault (Kho Mẫu Nền Poster: 24 backdrops across XE, MEME, ART)
  const isLegacyRequested = preferences.backdropSource === 'legacy' || preferences.source === 'legacy';
  if (!isLegacyRequested) {
    const obsidianMatch = obsidianPosterService.matchBackdrop(brief, preferences);
    if (obsidianMatch && obsidianMatch.backdrop) {
      const bd = obsidianMatch.backdrop;
      return {
        template: {
          id: bd.id,
          title: bd.title,
          localPath: bd.url,
          category: bd.category,
          source: 'obsidian',
          safeZone: bd.safeZone,
          recommendedColors: bd.recommendedColors,
          recommendedFonts: bd.recommendedFonts
        },
        categoryMatch: bd.category,
        matchedKeyword: obsidianMatch.matchedKeywords[0] || bd.id,
        source: 'obsidian',
        technique: obsidianMatch.technique
      };
    }
  }

  const allTemplates = getPicsartTemplates();
  const text = `${brief || ''} ${preferences.industry || ''} ${preferences.mood || ''}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    const matchedKw = rule.keywords.find(k => text.includes(k));
    if (matchedKw) {
      let found = allTemplates.find(t =>
        rule.preferredSubstrings.some(sub => t.localFilename.toLowerCase().includes(sub) || t.title.toLowerCase().includes(sub))
      );
      if (!found) {
        found = allTemplates.find(t => t.category === rule.category || rule.keywords.some(k => t.title.toLowerCase().includes(k)));
      }
      if (found) {
        return { template: found, categoryMatch: found.category || rule.category, matchedKeyword: matchedKw, subCategory: rule.category };
      }
    }
  }

  const defaultBd = obsidianPosterService.getBackdropById('XE-02') || obsidianPosterService.getBackdrops()[0];
  return {
    template: { id: defaultBd.id, title: defaultBd.title, localPath: defaultBd.url, category: defaultBd.category, source: 'obsidian', safeZone: defaultBd.safeZone, recommendedColors: defaultBd.recommendedColors, recommendedFonts: defaultBd.recommendedFonts },
    categoryMatch: defaultBd.category,
    matchedKeyword: 'obsidian_default',
    source: 'obsidian'
  };
}

function createVariant({ brief, preferences, copy, style, palette, layout, aspectRatio, index, template }) {
  const [width, height] = SIZES[aspectRatio];
  const matchedHarmony = obsidianColorService.getHarmonyById(palette.id) || obsidianColorService.matchHarmony(brief, preferences);
  const headline = cleanText(copy.title, deriveHeadline(brief, copy, preferences), 54).toUpperCase();
  const content = {
    eyebrow: cleanText(copy.eyebrow, preferences.industry || (matchedHarmony && matchedHarmony.keywords[0] ? `CHÍNH HÃNG ${matchedHarmony.keywords[0].toUpperCase()}` : style.label), 34).toUpperCase(),
    title: headline,
    subtitle: cleanText(copy.subtitle, deriveProductSubtitle(brief, preferences), 110),
    cta: cleanText(copy.cta, 'MUA NGAY', 28).toUpperCase()
  };
  const signature = `${style.id}:${layout}:${palette.id}`;
  const fallbackBd = obsidianPosterService.getBackdropById('XE-02') || obsidianPosterService.getBackdrops()[0];
  const effectiveTemplate = template || {
    id: fallbackBd.id,
    title: fallbackBd.title,
    localPath: fallbackBd.url,
    category: fallbackBd.category,
    source: 'obsidian'
  };

  const baseBackground = {
    type: 'template',
    url: effectiveTemplate.localPath,
    title: effectiveTemplate.title
  };

  return {
    schemaVersion: '3.0',
    variantId: `variant_${index + 1}_${hashString(signature + brief).toString(36)}`,
    style: style.id,
    styleLabel: style.label,
    layout,
    palette: palette.id,
    signature,
    preset: aspectRatio,
    title: content.title,
    subtitle: content.subtitle,
    badge: content.eyebrow,
    colorHarmony: {
      id: matchedHarmony.id,
      name: matchedHarmony.name,
      harmonyType: matchedHarmony.harmonyType,
      rule60: matchedHarmony.rule60,
      rule30: matchedHarmony.rule30,
      rule10: matchedHarmony.rule10
    },
    template: effectiveTemplate,
    templateUrl: effectiveTemplate.localPath,
    templateTitle: effectiveTemplate.title,
    artDirection: `Áp dụng mẫu nền Obsidian "${effectiveTemplate.title}" kết hợp bảng phối màu 60-30-10 "${matchedHarmony.name}" và phong cách ${style.label}.`,
    keyVisual: {
      mode: 'generate_without_text',
      prompt: buildKeyVisualPrompt({ brief, audience: preferences.audience, style, palette, layout, aspectRatio }),
      negativePrompt: 'text, typography, letters, numbers, logo, watermark, distorted product, clutter',
      role: 'background_and_key_visual'
    },
    canvas: {
      width,
      height,
      safeMarginPercent: 6,
      background: baseBackground,
      backdrop: effectiveTemplate.localPath
    },
    layers: createLayers(layout, palette, style, content),
    personalization: { ...preferences, appliedBrandColors: preferences.brandColors }
  };
}

function createDesignSet(input = {}) {
  const brief = cleanText(input.brief, '', 800);
  if (!brief) {
    const error = new Error('Creative brief is required.');
    error.statusCode = 400;
    throw error;
  }
  const preferences = normalizePreferences(input.preferences);
  const copy = input.copy && typeof input.copy === 'object' ? input.copy : {};
  const history = normalizeHistory(input.history);
  const aspectRatio = SIZES[input.aspectRatio] ? input.aspectRatio : '9:16';
  const count = Math.max(1, Math.min(Number(input.variantCount) || 3, 3));
  const styles = chooseStyles(brief, preferences, history, count);
  const usedLayouts = new Set(history.slice(-4).map(item => item.layout));
  const usedPalettes = new Set(history.slice(-4).map(item => item.palette));
  const seed = hashString(`${brief}:${history.length}`);

  let matchedTemplate = null;
  const targetId = input.templateId || input.backdropId;
  if (targetId) {
    const bd = obsidianPosterService.getBackdropById(targetId);
    if (bd) {
      matchedTemplate = { id: bd.id, title: bd.title, localPath: bd.url, category: bd.category, source: 'obsidian', safeZone: bd.safeZone, recommendedColors: bd.recommendedColors };
    } else {
      matchedTemplate = getPicsartTemplates().find(t => t.id === targetId) || null;
    }
  } else {
    matchedTemplate = matchTemplateForProduct(brief, preferences).template;
  }

  return styles.map((style, index) => {
    const layout = chooseUnused(LAYOUTS, usedLayouts, seed + index * 3);
    usedLayouts.add(layout);
    let palette = chooseUnused(PALETTES, usedPalettes, seed + index * 5);
    usedPalettes.add(palette.id);
    if (preferences.brandColors.length) {
      palette = { ...palette, id: `brand_${palette.id}`, colors: [...preferences.brandColors, ...palette.colors].slice(0, 3) };
    }
    return createVariant({ brief, preferences, copy, style, palette, layout, aspectRatio, index, template: matchedTemplate });
  });
}

const path = require('path');
const fs = require('fs');

let _cachedTemplates = null;

function getPicsartTemplates(category) {
  try {
    if (!_cachedTemplates) {
      const metadataPath = path.join(__dirname, '../../../public/templates/posters/posters.json');
      if (fs.existsSync(metadataPath)) {
        _cachedTemplates = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } else {
        _cachedTemplates = [];
      }
    }
    if (!category || category === 'all') {
      return _cachedTemplates;
    }
    return _cachedTemplates.filter(item => item.category === category);
  } catch (err) {
    console.error('Error reading Picsart poster templates:', err.message);
    return [];
  }
}

function getCatalog() {
  return {
    styles: STYLES.map(({ id, label, keywords }) => ({ id, label, keywords })),
    palettes: PALETTES,
    layouts: LAYOUTS,
    aspectRatios: Object.keys(SIZES),
    templates: getPicsartTemplates(),
    obsidianBackdrops: obsidianPosterService.getBackdrops(),
    posterTechniques: obsidianPosterService.getTechniques()
  };
}

module.exports = { createDesignSet, getCatalog, normalizePreferences, normalizeHistory, buildKeyVisualPrompt, getPicsartTemplates, matchTemplateForProduct, obsidianPosterService };
