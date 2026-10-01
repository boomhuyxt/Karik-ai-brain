/**
 * Obsidian Color Service
 * Implements color knowledge, palettes, conversion, and 60-30-10 harmonies
 * derived directly from Admin's Obsidian Vault:
 * - wiki/Bảng Mã Màu HTML CSS RGB CMYK (00, 01, 02, 03)
 * - raw/Bảng code màu HTML, CSS, RGB, CMYK chuẩn.md
 * - raw/Dựa Vào Tone Màu.md
 * - raw/Muốn Tone Màu Chủ.md
 */

const OBSIDIAN_COLORS = {
  // 1. Nhóm W3C & Trung Tính (Grayscale & Neutrals)
  black: { name: 'Black', vn: 'Đen tuyền', hex: '#000000', rgb: 'rgb(0, 0, 0)', cmyk: 'cmyk(0, 0, 0, 100)', group: 'grayscale' },
  richBlack: { name: 'Rich Black', vn: 'Đen ấm in ấn', hex: '#0B0F19', rgb: 'rgb(11, 15, 25)', cmyk: 'cmyk(60, 40, 40, 100)', group: 'grayscale' },
  darkSlate: { name: 'Dark Slate Gray', vn: 'Xám phiến đá đậm', hex: '#1C1C1C', rgb: 'rgb(28, 28, 28)', cmyk: 'cmyk(0, 0, 0, 89)', group: 'grayscale' },
  dimGray: { name: 'Dim Gray', vn: 'Xám mờ', hex: '#696969', rgb: 'rgb(105, 105, 105)', cmyk: 'cmyk(0, 0, 0, 59)', group: 'grayscale' },
  silver: { name: 'Silver', vn: 'Bạc kim loại', hex: '#C0C0C0', rgb: 'rgb(192, 192, 192)', cmyk: 'cmyk(0, 0, 0, 25)', group: 'grayscale' },
  lightGray: { name: 'Light Gray', vn: 'Xám sáng', hex: '#D3D3D3', rgb: 'rgb(211, 211, 211)', cmyk: 'cmyk(0, 0, 0, 17)', group: 'grayscale' },
  whiteSmoke: { name: 'White Smoke', vn: 'Khói trắng', hex: '#F5F5F5', rgb: 'rgb(245, 245, 245)', cmyk: 'cmyk(0, 0, 0, 4)', group: 'grayscale' },
  ghostWhite: { name: 'Ghost White', vn: 'Trắng sứ dịu mắt', hex: '#F8F8FF', rgb: 'rgb(248, 248, 255)', cmyk: 'cmyk(3, 3, 0, 0)', group: 'grayscale' },
  white: { name: 'White', vn: 'Trắng sáng', hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)', cmyk: 'cmyk(0, 0, 0, 0)', group: 'grayscale' },

  // 2. Nhóm Xanh Dương & Công Nghệ (Blues & Cyans)
  cyan: { name: 'Cyan / Aqua', vn: 'Xanh lơ sáng', hex: '#00FFFF', rgb: 'rgb(0, 255, 255)', cmyk: 'cmyk(100, 0, 0, 0)', group: 'blues' },
  deepSkyBlue: { name: 'Deep Sky Blue', vn: 'Xanh trời rực rỡ', hex: '#00BFFF', rgb: 'rgb(0, 191, 255)', cmyk: 'cmyk(100, 25, 0, 0)', group: 'blues' },
  dodgerBlue: { name: 'Dodger Blue', vn: 'Xanh link / CTA', hex: '#1E90FF', rgb: 'rgb(30, 144, 255)', cmyk: 'cmyk(88, 44, 0, 0)', group: 'blues' },
  royalBlue: { name: 'Royal Blue', vn: 'Xanh hoàng gia', hex: '#4169E1', rgb: 'rgb(65, 105, 225)', cmyk: 'cmyk(71, 53, 0, 12)', group: 'blues' },
  steelBlue: { name: 'Steel Blue', vn: 'Xanh thép trầm', hex: '#4682B4', rgb: 'rgb(70, 130, 180)', cmyk: 'cmyk(61, 28, 0, 29)', group: 'blues' },
  blueCoban: { name: 'Cobalt Blue (Print)', vn: 'Xanh coban in ấn', hex: '#205AA7', rgb: 'rgb(32, 90, 167)', cmyk: 'cmyk(100, 60, 0, 0)', group: 'blues' },
  navy: { name: 'Navy Blue', vn: 'Xanh hải quân', hex: '#000080', rgb: 'rgb(0, 0, 128)', cmyk: 'cmyk(100, 100, 0, 50)', group: 'blues' },
  midnightBlue: { name: 'Midnight Blue', vn: 'Xanh đêm thẳm', hex: '#191970', rgb: 'rgb(25, 25, 112)', cmyk: 'cmyk(78, 78, 0, 56)', group: 'blues' },

  // 3. Nhóm Màu Ấm: Đỏ, Cam, Vàng (Warm Colors)
  gold: { name: 'Gold', vn: 'Vàng kim VIP', hex: '#FFD700', rgb: 'rgb(255, 215, 0)', cmyk: 'cmyk(0, 16, 100, 0)', group: 'warm' },
  yellowLemon: { name: 'Lemon Yellow', vn: 'Vàng chanh tươi', hex: '#F9F400', rgb: 'rgb(249, 244, 0)', cmyk: 'cmyk(0, 0, 100, 0)', group: 'warm' },
  goldenrod: { name: 'Goldenrod', vn: 'Vàng đồng kim loại', hex: '#C18C00', rgb: 'rgb(193, 140, 0)', cmyk: 'cmyk(0, 40, 100, 25)', group: 'warm' },
  orangeFresh: { name: 'Fresh Orange', vn: 'Cam tươi bao bì', hex: '#EC870E', rgb: 'rgb(236, 135, 14)', cmyk: 'cmyk(0, 60, 100, 0)', group: 'warm' },
  tomato: { name: 'Tomato', vn: 'Đỏ cam tươi', hex: '#FF6347', rgb: 'rgb(255, 99, 71)', cmyk: 'cmyk(0, 61, 72, 0)', group: 'warm' },
  orangeRed: { name: 'Orange Red', vn: 'Đỏ cam khẩn cấp', hex: '#FF4500', rgb: 'rgb(255, 69, 0)', cmyk: 'cmyk(0, 73, 100, 0)', group: 'warm' },
  crimson: { name: 'Crimson', vn: 'Đỏ thắm Motul', hex: '#DC143C', rgb: 'rgb(220, 20, 60)', cmyk: 'cmyk(0, 91, 73, 14)', group: 'warm' },
  redPrint: { name: 'Standard Red (Print)', vn: 'Đỏ cờ in ấn chuẩn', hex: '#DF0029', rgb: 'rgb(223, 0, 41)', cmyk: 'cmyk(0, 100, 100, 0)', group: 'warm' },
  bordeauxRed: { name: 'Bordeaux Dark Red', vn: 'Đỏ booc-đô sang trọng', hex: '#8B0016', rgb: 'rgb(139, 0, 22)', cmyk: 'cmyk(0, 100, 100, 45)', group: 'warm' },

  // 4. Nhóm Xanh Lá (Greens & Emeralds)
  limeGreen: { name: 'Lime Green', vn: 'Xanh dạ quang', hex: '#32CD32', rgb: 'rgb(50, 205, 50)', cmyk: 'cmyk(76, 0, 76, 20)', group: 'greens' },
  leafGreen: { name: 'Leaf Green (Print)', vn: 'Xanh nõn nông sản', hex: '#5BBD2B', rgb: 'rgb(91, 189, 43)', cmyk: 'cmyk(60, 0, 100, 0)', group: 'greens' },
  teal: { name: 'Teal', vn: 'Xanh mòng két', hex: '#008080', rgb: 'rgb(0, 128, 128)', cmyk: 'cmyk(100, 0, 0, 50)', group: 'greens' },
  forestGreen: { name: 'Forest Green', vn: 'Xanh rừng thẳm', hex: '#006241', rgb: 'rgb(0, 98, 65)', cmyk: 'cmyk(100, 0, 90, 45)', group: 'greens' },
  seaGreen: { name: 'Sea Green', vn: 'Xanh biển sâu', hex: '#2E8B57', rgb: 'rgb(46, 139, 87)', cmyk: 'cmyk(67, 0, 37, 45)', group: 'greens' },

  // 5. Nhóm Tím & Huyền Bí (Purples & Cyber)
  darkOrchid: { name: 'Dark Orchid', vn: 'Tím hoa lan đậm', hex: '#9932CC', rgb: 'rgb(153, 50, 204)', cmyk: 'cmyk(25, 75, 0, 20)', group: 'purples' },
  purpleHue: { name: 'Hue Purple (Print)', vn: 'Tím huế in ấn', hex: '#5D0C7B', rgb: 'rgb(93, 12, 123)', cmyk: 'cmyk(80, 100, 0, 0)', group: 'purples' },
  slateBlue: { name: 'Slate Blue', vn: 'Tím ánh lam', hex: '#6A5ACD', rgb: 'rgb(106, 90, 205)', cmyk: 'cmyk(48, 56, 0, 20)', group: 'purples' },
  magenta: { name: 'Magenta / Fuchsia', vn: 'Hồng cánh sen', hex: '#FF00FF', rgb: 'rgb(255, 0, 255)', cmyk: 'cmyk(0, 100, 0, 0)', group: 'purples' }
};

/**
 * 60-30-10 Golden Rule Poster Harmonies
 * Defined by Obsidian Color Theory (wiki/03. Best Practices & Ứng Dụng Thiết Kế & In Ấn)
 */
const OBSIDIAN_HARMONIES = [
  {
    id: 'racing_gold',
    name: 'Vàng Kim Biker & Cơ Khí (Racing Gold)',
    description: 'Tone đen sâu phối vàng kim và xanh thép — Đậm chất Biker, dầu nhớt cao cấp và độ xe chuyên nghiệp.',
    harmonyType: 'complementary',
    rule60: {
      role: '60% Màu chủ đạo / Nền (Dominant Background)',
      name: 'Rich Black',
      hex: '#0B0F19',
      rgb: 'rgb(11, 15, 25)',
      cmyk: 'cmyk(60, 40, 40, 100)'
    },
    rule30: {
      role: '30% Cấu trúc, thẻ & viền (Secondary Structure)',
      name: 'Steel Blue',
      hex: '#334155',
      rgb: 'rgb(51, 65, 85)',
      cmyk: 'cmyk(40, 24, 0, 67)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm (Accent / CTA)',
      name: 'Gold Metallic',
      hex: '#FFD700',
      rgb: 'rgb(255, 215, 0)',
      cmyk: 'cmyk(0, 16, 100, 0)'
    },
    textColors: {
      headline: '#FFFFFF',
      subtext: '#FDE047',
      badge: '#FFD700',
      badgeText: '#020617',
      ctaBg: '#FFD700',
      ctaText: '#020617'
    },
    keywords: ['nhớt', 'dầu nhớt', 'motul', 'xe', 'harley', 'biker', 'cơ khí', 'phụ tùng', 'vàng kim', 'racing']
  },
  {
    id: 'motul_crimson',
    name: 'Đỏ Năng Lượng Đường Đua (Motul Crimson)',
    description: 'Tone xám đen than phối đỏ cờ thể thao và viền bạc — Tạo cảm giác bứt phá tốc độ, mãnh lực và kích thích hành động mua.',
    harmonyType: 'complementary',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'Dark Slate Gray',
      hex: '#111827',
      rgb: 'rgb(17, 24, 39)',
      cmyk: 'cmyk(56, 38, 0, 85)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Silver Metallic',
      hex: '#94A3B8',
      rgb: 'rgb(148, 163, 184)',
      cmyk: 'cmyk(20, 11, 0, 28)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Crimson Red (Print DF0029)',
      hex: '#DC143C',
      rgb: 'rgb(220, 20, 60)',
      cmyk: 'cmyk(0, 91, 73, 14)'
    },
    textColors: {
      headline: '#FFFFFF',
      subtext: '#F87171',
      badge: '#DC143C',
      badgeText: '#FFFFFF',
      ctaBg: '#DC143C',
      ctaText: '#FFFFFF'
    },
    keywords: ['motul', 'đỏ', 'đua xe', 'tốc độ', 'khuyến mãi', 'hot deal', 'thể thao', 'phanh', 'lốp', 'bugi']
  },
  {
    id: 'cyber_cyan',
    name: 'Xanh Lơ Tương Lai (Cyberpunk Cyan)',
    description: 'Tone xanh đêm sâu thẳm phối tím hoa lan và xanh lơ Neon — Đỉnh cao phong cách công nghệ số, đồ họa Art và viễn tưởng.',
    harmonyType: 'triadic',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'Midnight Dark Blue',
      hex: '#07111F',
      rgb: 'rgb(7, 17, 31)',
      cmyk: 'cmyk(77, 45, 0, 88)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Dark Orchid Violet',
      hex: '#6366F1',
      rgb: 'rgb(99, 102, 241)',
      cmyk: 'cmyk(59, 58, 0, 5)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Electric Cyan Aqua',
      hex: '#00FFFF',
      rgb: 'rgb(0, 255, 255)',
      cmyk: 'cmyk(100, 0, 0, 0)'
    },
    textColors: {
      headline: '#FFFFFF',
      subtext: '#38BDF8',
      badge: '#00FFFF',
      badgeText: '#020617',
      ctaBg: '#00FFFF',
      ctaText: '#020617'
    },
    keywords: ['cyber', 'công nghệ', 'ai', 'art', 'game', 'neon', 'tương lai', 'xanh lơ', 'hud', 'đèn led']
  },
  {
    id: 'sunset_amber',
    name: 'Hoàng Hôn Nắng Sa Mạc (Sunset Amber)',
    description: 'Tone đất ấm sa mạc phối cam tươi và vàng rực — Dành cho cruiser đường trường, phượt bụi và phiêu lưu mạo hiểm.',
    harmonyType: 'analogous',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'Deep Earth Noir',
      hex: '#18120C',
      rgb: 'rgb(24, 18, 12)',
      cmyk: 'cmyk(0, 25, 50, 91)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Warm Bronze',
      hex: '#78350F',
      rgb: 'rgb(120, 53, 15)',
      cmyk: 'cmyk(0, 56, 88, 53)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Fresh Orange (Print EC870E)',
      hex: '#F59E0B',
      rgb: 'rgb(245, 158, 11)',
      cmyk: 'cmyk(0, 36, 96, 4)'
    },
    textColors: {
      headline: '#FFFBEB',
      subtext: '#FCD34D',
      badge: '#F59E0B',
      badgeText: '#020617',
      ctaBg: '#F59E0B',
      ctaText: '#020617'
    },
    keywords: ['sa mạc', 'phượt', 'touring', 'cruiser', 'nắng', 'hoàng hôn', 'ấm', 'da bò', 'vintage']
  },
  {
    id: 'emerald_racing',
    name: 'Xanh Lục Bảo Uy Lực (Emerald Racing)',
    description: 'Tone xanh rừng sâu thẳm phối xanh nõn dạ quang và vàng kim — Thể hiện sự bền bỉ, tiết kiệm nhiên liệu và bảo vệ 24/7.',
    harmonyType: 'analogous',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'Deep Forest Green',
      hex: '#052E16',
      rgb: 'rgb(5, 46, 22)',
      cmyk: 'cmyk(89, 0, 52, 82)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Sea Green Emerald',
      hex: '#0D9488',
      rgb: 'rgb(13, 148, 136)',
      cmyk: 'cmyk(91, 0, 8, 42)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Lime Green Glow',
      hex: '#22C55E',
      rgb: 'rgb(34, 197, 94)',
      cmyk: 'cmyk(83, 0, 52, 23)'
    },
    textColors: {
      headline: '#F0FDF4',
      subtext: '#86EFAC',
      badge: '#22C55E',
      badgeText: '#020617',
      ctaBg: '#22C55E',
      ctaText: '#020617'
    },
    keywords: ['xanh lá', 'bảo vệ', 'tiết kiệm', 'sinh thái', 'dầu sinh học', 'nông sản', 'rừng', 'lục bảo']
  },
  {
    id: 'royal_luxury',
    name: 'Xanh Hoàng Gia Quyền Quý (Royal Luxury)',
    description: 'Tone xanh Navy đậm phối xanh Cobalt và chữ vàng kim — Tôn vinh đẳng cấp, cam kết chính hãng và bảo hành uy tín.',
    harmonyType: 'complementary',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'Deep Navy Blue',
      hex: '#0A1128',
      rgb: 'rgb(10, 17, 40)',
      cmyk: 'cmyk(75, 58, 0, 84)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Royal Blue (Print 205AA7)',
      hex: '#1C3D5A',
      rgb: 'rgb(28, 61, 90)',
      cmyk: 'cmyk(69, 32, 0, 65)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Gold Accent',
      hex: '#FACC15',
      rgb: 'rgb(250, 204, 21)',
      cmyk: 'cmyk(0, 18, 92, 2)'
    },
    textColors: {
      headline: '#F8FAFC',
      subtext: '#93C5FD',
      badge: '#FACC15',
      badgeText: '#020617',
      ctaBg: '#FACC15',
      ctaText: '#020617'
    },
    keywords: ['chính hãng', 'bảo hành', 'cao cấp', 'hoàng gia', 'doanh nghiệp', 'uy tín', 'nhập khẩu']
  },
  {
    id: 'monochrome_silver',
    name: 'Đơn Sắc Bạc Kim (Monochrome Silver)',
    description: 'Tone đen tuyền 100K phối xám bạc kim loại — Hiện đại, tối giản, làm sản phẩm màu sắc nổi bật tuyệt đối trên nền.',
    harmonyType: 'monochromatic',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'True Black 100K',
      hex: '#0A0A0A',
      rgb: 'rgb(10, 10, 10)',
      cmyk: 'cmyk(0, 0, 0, 96)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Dim Gray',
      hex: '#475569',
      rgb: 'rgb(71, 85, 105)',
      cmyk: 'cmyk(32, 19, 0, 59)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Silver Chrome',
      hex: '#F1F5F9',
      rgb: 'rgb(241, 245, 249)',
      cmyk: 'cmyk(3, 2, 0, 2)'
    },
    textColors: {
      headline: '#FFFFFF',
      subtext: '#CBD5E1',
      badge: '#E2E8F0',
      badgeText: '#020617',
      ctaBg: '#FFFFFF',
      ctaText: '#020617'
    },
    keywords: ['tối giản', 'đen trắng', 'kim loại', 'bạc', 'cơ khí', 'thép', 'titan', 'mono']
  },
  {
    id: 'fresh_minimalist',
    name: 'Thiên Nhiên Thuần Khiết (Fresh Minimalist)',
    description: 'Tone trắng kem ngà phối xanh rêu và điểm nhấn vàng chanh — Từ ghi chú "Dựa Vào Tone Màu.md" trong Vault.',
    harmonyType: 'analogous',
    rule60: {
      role: '60% Màu chủ đạo / Nền',
      name: 'Ivory Cream White',
      hex: '#F8F9F5',
      rgb: 'rgb(248, 249, 245)',
      cmyk: 'cmyk(0, 0, 2, 2)'
    },
    rule30: {
      role: '30% Cấu trúc & thẻ',
      name: 'Pure Moss Green',
      hex: '#4A6B53',
      rgb: 'rgb(74, 107, 83)',
      cmyk: 'cmyk(31, 0, 22, 58)'
    },
    rule10: {
      role: '10% Điểm nhấn CTA & Tiêu điểm',
      name: 'Lemon Lime Accent',
      hex: '#1C3323',
      rgb: 'rgb(28, 51, 35)',
      cmyk: 'cmyk(45, 0, 31, 80)'
    },
    textColors: {
      headline: '#1C3323',
      subtext: '#4A6B53',
      badge: '#4A6B53',
      badgeText: '#FFFFFF',
      ctaBg: '#1C3323',
      ctaText: '#FFFFFF'
    },
    keywords: ['sáng', 'thiên nhiên', 'thuần khiết', 'trắng kem', 'fresh', 'tươi mới', 'hữu cơ', 'organic']
  }
];

function getColors() {
  return OBSIDIAN_COLORS;
}

function getHarmonies() {
  return OBSIDIAN_HARMONIES;
}

function getHarmonyById(id) {
  if (!id) return null;
  const str = String(id).toLowerCase().trim();
  return OBSIDIAN_HARMONIES.find(h => h.id.toLowerCase() === str) || null;
}

function matchHarmony(brief, preferences = {}) {
  const targetId = preferences.harmonyId || preferences.paletteId || preferences.colorTone;
  if (targetId) {
    const found = getHarmonyById(targetId);
    if (found) return found;
  }

  const text = `${brief || ''} ${preferences.industry || ''} ${preferences.mood || ''}`.toLowerCase();

  for (const h of OBSIDIAN_HARMONIES) {
    const matched = h.keywords.some(k => text.includes(k));
    if (matched) {
      return h;
    }
  }

  // Default to Racing Gold (the flagship biker/mechanical harmony)
  return OBSIDIAN_HARMONIES[0];
}

module.exports = {
  OBSIDIAN_COLORS,
  OBSIDIAN_HARMONIES,
  getColors,
  getHarmonies,
  getHarmonyById,
  matchHarmony
};
