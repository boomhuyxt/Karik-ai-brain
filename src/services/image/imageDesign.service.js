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

const PALETTES = [
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
].map(([id, background, secondary, accent, text, subtext]) => ({ id, colors: [background, secondary, accent], text, subtext }));

const LAYOUTS = ['editorial_split', 'hero_center', 'diagonal_motion', 'frame_within_frame', 'asymmetric_grid', 'bottom_stage'];
const SIZES = { '1:1': [1080, 1080], '4:5': [1080, 1350], '9:16': [1080, 1920], '16:9': [1920, 1080] };

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
    editorial_split: { subject: [70, 55, 54, 60], text: [7, 14, 45, 'left'], cta: [7, 85, 'left'] },
    hero_center: { subject: [54, 54, 58, 55], text: [8, 9, 84, 'left'], cta: [8, 87, 'left'] },
    diagonal_motion: { subject: [68, 59, 58, 63], text: [7, 12, 48, 'left'], cta: [7, 86, 'left'] },
    frame_within_frame: { subject: [58, 55, 62, 58], text: [9, 10, 55, 'left'], cta: [9, 87, 'left'] },
    asymmetric_grid: { subject: [31, 59, 51, 61], text: [58, 13, 35, 'left'], cta: [58, 83, 'left'] },
    bottom_stage: { subject: [66, 39, 54, 50], text: [7, 61, 72, 'left'], cta: [7, 89, 'left'] }
  };
  const c = compositions[layout] || compositions.editorial_split;
  const motif = [];
  const addShape = (id, shape, x, y, width, height, fill, extra = {}) => motif.push({
    id, type: 'shape', shape, x, y, width, height, fill, ...extra
  });

  switch (style.id) {
    case 'swiss_grid':
      addShape('grid_vertical', 'rect', 55, 50, 0.25, 88, accent, { opacity: 0.75 });
      addShape('grid_horizontal', 'rect', 50, 76, 88, 0.22, accent, { opacity: 0.5 });
      addShape('index_block', 'rect', 90, 9, 7, 7, accent);
      break;
    case 'kinetic_sport':
      addShape('speed_bar_back', 'rect', 63, 50, 92, 16, secondary, { angle: -13, opacity: 0.42 });
      addShape('speed_bar_accent', 'rect', 68, 57, 94, 2.2, accent, { angle: -13 });
      addShape('speed_tick', 'rect', 13, 72, 18, 1.2, palette.text, { angle: -13, opacity: 0.7 });
      break;
    case 'retro_future':
    case 'y2k_chrome':
      addShape('orbit_outer', 'ellipse', 65, 53, 62, 38, 'transparent', { stroke: accent, strokeWidth: 4, angle: -18, opacity: 0.7 });
      addShape('orbit_inner', 'ellipse', 65, 53, 43, 24, 'transparent', { stroke: palette.text, strokeWidth: 2, angle: 18, opacity: 0.45 });
      addShape('horizon', 'rect', 50, 76, 88, 0.4, accent, { opacity: 0.55 });
      break;
    case 'neo_brutalism':
      addShape('brutal_panel', 'rect', 66, 54, 56, 58, secondary, { angle: 3, stroke: palette.text, strokeWidth: 5 });
      addShape('brutal_tag', 'rect', 20, 14, 26, 7, accent, { angle: -3 });
      addShape('brutal_rule', 'rect', 44, 79, 74, 2, palette.text, { angle: -3 });
      break;
    case 'editorial_luxury':
    case 'heritage_craft':
      addShape('editorial_frame', 'rect', 50, 50, 88, 88, 'transparent', { stroke: accent, strokeWidth: 2, opacity: 0.8 });
      addShape('editorial_rule', 'rect', 52, 50, 0.22, 76, accent, { opacity: 0.65 });
      addShape('folio', 'ellipse', 91, 91, 4.5, 4.5, accent);
      break;
    case 'paper_collage':
      addShape('paper_shadow', 'rect', 66, 54, 55, 62, '#000000', { angle: 5, opacity: 0.24 });
      addShape('paper_card', 'rect', 64, 52, 55, 62, secondary, { angle: -3 });
      addShape('paper_tape', 'rect', 67, 21, 18, 4, accent, { angle: 7, opacity: 0.82 });
      break;
    case 'cinematic_noir':
      addShape('cinema_letterbox_top', 'rect', 50, 3, 100, 6, '#000000', { opacity: 0.75 });
      addShape('cinema_letterbox_bottom', 'rect', 50, 97, 100, 6, '#000000', { opacity: 0.75 });
      addShape('cinema_light', 'ellipse', 69, 48, 52, 66, accent, { opacity: 0.12, angle: -12 });
      break;
    case 'data_futurism':
      addShape('data_panel', 'rect', 74, 49, 40, 68, secondary, { opacity: 0.38, stroke: accent, strokeWidth: 2 });
      [0, 1, 2, 3].forEach(i => addShape(`data_bar_${i}`, 'rect', 82 + i * 3, 80 - i * 5, 1.2, 8 + i * 5, accent, { opacity: 0.45 + i * 0.12 }));
      break;
    case 'soft_3d':
      addShape('soft_panel', 'roundedRect', 67, 53, 55, 62, secondary, { cornerRadius: 44, opacity: 0.62 });
      addShape('soft_dot_a', 'ellipse', 88, 23, 11, 11, accent, { opacity: 0.72 });
      addShape('soft_dot_b', 'ellipse', 50, 81, 7, 7, palette.text, { opacity: 0.38 });
      break;
    default:
      addShape('organic_blob_a', 'ellipse', 68, 52, 54, 61, secondary, { angle: -12, opacity: 0.48 });
      addShape('organic_blob_b', 'ellipse', 82, 65, 21, 25, accent, { opacity: 0.22 });
  }

  const [subjectX, subjectY, subjectW, subjectH] = c.subject;
  const [textX, textY, textW, textAlign] = c.text;
  const [ctaX, ctaY, ctaAlign] = c.cta;
  const ctaCenter = ctaAlign === 'left' ? ctaX + 13 : ctaX;
  return [
    ...motif,
    { id: 'main_subject', type: 'image', x: subjectX, y: subjectY, width: subjectW, height: subjectH, fit: 'contain', removeBackground: true },
    { id: 'eyebrow', type: 'text', text: copy.eyebrow, x: textX, y: textY, width: textW, height: 4, align: textAlign, fontFamily: style.fonts[1], fontWeight: 700, fontSize: 17, charSpacing: 90, color: accent },
    { id: 'headline', type: 'text', text: copy.title, x: textX, y: textY + 9, width: textW, height: 17, align: textAlign, fontFamily: style.fonts[0], fontWeight: 800, fontSize: 64, minFontSize: 34, lineHeight: 0.96, color: palette.text },
    { id: 'subtext', type: 'text', text: copy.subtitle, x: textX, y: textY + 24, width: Math.min(textW, 48), height: 10, align: textAlign, fontFamily: style.fonts[1], fontWeight: 400, fontSize: 21, minFontSize: 15, lineHeight: 1.3, color: palette.subtext },
    { id: 'cta_bg', type: 'shape', shape: style.id === 'neo_brutalism' ? 'rect' : 'roundedRect', x: ctaCenter, y: ctaY, width: 26, height: 5.6, fill: accent, cornerRadius: style.id === 'neo_brutalism' ? 0 : 16 },
    { id: 'cta_text', type: 'text', text: copy.cta, x: ctaCenter, y: ctaY, width: 22, height: 3.8, align: 'center', fontFamily: style.fonts[1], fontWeight: 700, fontSize: 17, minFontSize: 13, color: background }
  ];
}

function deriveHeadline(brief) {
  const firstIdea = cleanText(brief, 'Ý TƯỞNG MỚI', 140).split(/[.!?;:\n]/)[0];
  const withoutCommand = firstIdea
    .replace(/^(hãy\s+)?(thiết kế|tạo|làm)\s+(một\s+)?/i, '')
    .replace(/^(một\s+)?(poster|ảnh|hình ảnh)\s*/i, '');
  return cleanText(withoutCommand.split(/\s+/).filter(Boolean).slice(0, 7).join(' '), 'Ý TƯỞNG MỚI', 46);
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
        template: { id: bd.id, title: bd.title, localPath: bd.url, category: bd.category, source: 'obsidian', safeZone: bd.safeZone, recommendedColors: bd.recommendedColors },
        categoryMatch: bd.category,
        matchedKeyword: bd.id,
        source: 'obsidian'
      };
    }
  }

  const allTemplates = getPicsartTemplates();
  const text = `${brief || ''} ${preferences.industry || ''} ${preferences.mood || ''}`.toLowerCase();

  // 2. Prioritize Obsidian Vault backdrops for automotive, bike, mechanical, garage, and meme intents
  const isObsidianDomain = /(?:nhớt|dầu nhớt|phụ tùng|biker|xe máy|gara|sửa xe|đua xe|harley|bugi|pô|castrol|motul|cơ khí|thép|drift|meme|drake|bateman|akira|truman)/i.test(text);
  if (isObsidianDomain) {
    const obsidianMatch = obsidianPosterService.matchBackdrop(brief, preferences);
    if (obsidianMatch && obsidianMatch.score > 0) {
      const bd = obsidianMatch.backdrop;
      return {
        template: { id: bd.id, title: bd.title, localPath: bd.url, category: bd.category, source: 'obsidian', safeZone: bd.safeZone, recommendedColors: bd.recommendedColors },
        categoryMatch: bd.category,
        matchedKeyword: obsidianMatch.matchedKeywords[0] || 'automotive',
        source: 'obsidian'
      };
    }
  }

  if (!allTemplates || allTemplates.length === 0) {
    return { template: null, categoryMatch: 'general', matchedKeyword: 'default' };
  }

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

  return { template: allTemplates[0], categoryMatch: 'general', matchedKeyword: 'default' };
}

function createVariant({ brief, preferences, copy, style, palette, layout, aspectRatio, index, template }) {
  const [width, height] = SIZES[aspectRatio];
  const content = {
    eyebrow: cleanText(copy.eyebrow, preferences.industry || style.label, 34).toUpperCase(),
    title: cleanText(copy.title, deriveHeadline(brief), 54).toUpperCase(),
    subtitle: cleanText(copy.subtitle, `Thiết kế dành cho ${preferences.audience || 'đúng đối tượng của bạn'}`, 110),
    cta: cleanText(copy.cta, 'KHÁM PHÁ NGAY', 28).toUpperCase()
  };
  const signature = `${style.id}:${layout}:${palette.id}`;
  const baseBackground = template ? {
    type: 'template',
    url: template.localPath,
    title: template.title
  } : {
    type: 'linearGradient',
    angle: (hashString(signature) % 120) + 30,
    stops: [{ offset: 0, color: palette.colors[0] }, { offset: 1, color: palette.colors[1] }]
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
    template: template || null,
    templateUrl: template ? template.localPath : null,
    templateTitle: template ? template.title : null,
    artDirection: template
      ? (template.source === 'obsidian' || /^(ART|MEME|XE)-/i.test(template.id)
          ? `Áp dụng mẫu nền Obsidian "${template.title}" thuộc kho mẫu Admin kết hợp phong cách ${style.label} và bố cục ${layout.replace(/_/g, ' ')}.`
          : `Lấy cảm hứng từ mẫu Picsart "${template.title}" kết hợp phong cách ${style.label} và bố cục ${layout.replace(/_/g, ' ')}.`)
      : `${style.label} với bố cục ${layout.replace(/_/g, ' ')} để khác biệt rõ với các thiết kế gần đây.`,
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
      backdrop: template ? template.localPath : null
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
  const aspectRatio = SIZES[input.aspectRatio] ? input.aspectRatio : '4:5';
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
    obsidianBackdrops: obsidianPosterService.getBackdrops()
  };
}

module.exports = { createDesignSet, getCatalog, normalizePreferences, normalizeHistory, buildKeyVisualPrompt, getPicsartTemplates, matchTemplateForProduct, obsidianPosterService };
