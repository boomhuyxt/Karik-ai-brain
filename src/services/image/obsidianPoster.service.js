/**
 * Obsidian Poster Service
 * Integrates knowledge and poster background assets trained in Admin's Obsidian Vault
 * (wiki/Kho Mẫu Nền Poster, wiki/10 Kỹ Thuật Thiết Kế Poster Phổ Biến, wiki/36 Ý Tưởng Thiết Kế Poster Sáng Tạo)
 */

const OBSIDIAN_COLORS = require('./obsidianColor.service');
const obsidianColorService = require('./obsidianColor.service');

const OBSIDIAN_BACKDROPS = [
  // --- NHÓM 1: ART (Nghệ Thuật, Tự Do & Cinematic Biker) ---
  {
    id: 'ART-01',
    title: 'Biker Giữa Rừng Đêm',
    category: 'art',
    path: 'raw/nền poster/art/072450696d6148ee2f9b1087e3c43565.jpg',
    aspectRatio: '9:16',
    keywords: ['biker', 'rừng', 'phượt', 'bảo hộ', 'touring', 'adventure', 'đêm', 'noir', 'tự do', 'rừng thông'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 35, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#FACC15', secondary: '#1E293B', background: '#0F172A' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Poster châm ngôn phượt, thương hiệu đồ bảo hộ, mũ bảo hiểm touring',
    aiPrompt: 'cinematic wide shot, silhouette of a custom fat-tire motorcycle rider stopped in the middle of a winding asphalt road through a misty dark pine forest, deep mood, dark noir atmosphere, centered vanishing point, 8k resolution, shot on 35mm lens --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-02',
    title: 'Harley Cafe Racer Trong Hầm Xe',
    category: 'art',
    path: 'raw/nền poster/art/4858e3a59054d72884e08fd9beb9341f.jpg',
    aspectRatio: '9:16',
    keywords: ['harley', 'cafe racer', 'dọn xe', 'garage', 'workshop', 'thời trang', 'độ xe', 'biker vintage'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 45, ctaY: 86, align: 'center' },
    recommendedColors: { text: '#FEF08A', accent: '#F8FAFC', secondary: '#334155', background: '#0F172A' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Poster dọn xe độ, Custom Workshop, thời trang Biker cổ điển',
    aiPrompt: 'custom cafe racer Harley-Davidson with checkered flag decal fuel tank parked in an underground industrial parking garage, low key dramatic lighting, blurred silhouette of mechanic in foreground, gritty realism, cinematic photography --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-03',
    title: 'Góc Ngước Chọc Trời Mù Sương & Máy Bay',
    category: 'art',
    path: 'raw/nền poster/art/5c3a0924d6149359d3826855ec2de5f6.jpg',
    aspectRatio: '9:16',
    keywords: ['chọc trời', 'tòa nhà', 'công nghệ', 'hàng không', 'khát vọng', 'kinh doanh', 'doanh nghiệp', 'vươn cao'],
    safeZone: { xMin: 15, xMax: 85, yMin: 35, yMax: 65, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#020617', accent: '#0284C7', secondary: '#94A3B8', background: '#F8FAFC' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Khát vọng vươn cao, công nghệ, chuyển đổi số, tuyển dụng cấp cao',
    aiPrompt: 'extreme worm\'s-eye view looking directly up 90 degrees at towering brutalist glass skyscrapers surrounded by heavy white fog, solitary passenger airplane flying across the foggy white center opening, monochromatic, cinematic --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-04',
    title: 'Cruiser Nắng Sa Mạc Cổ Điển',
    category: 'art',
    path: 'raw/nền poster/art/bcf071b789fbaa524cf084aed03db9ad.jpg',
    aspectRatio: '9:16',
    keywords: ['cruiser', 'sa mạc', 'dầu nhớt', 'đường trường', 'phượt bụi', 'tự do', 'nhớt', 'nắng ấm'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 45, ctaY: 86, align: 'center' },
    recommendedColors: { text: '#1E293B', accent: '#FFFFFF', secondary: '#F59E0B', background: '#FEF3C7' },
    recommendedFonts: ['Playfair Display', 'Inter'],
    useCase: 'Dầu nhớt đường trường, phượt bụi, tinh thần tự do phóng khoáng',
    aiPrompt: 'classic black and chrome cruiser motorcycle parked on asphalt shoulder of an endless highway in monument valley desert, warm golden hour sunset glow, vast red rock mesas in background, empty sky on top for copy --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-05',
    title: 'Sportbike Bão Tố Tốc Độ',
    category: 'art',
    path: 'raw/nền poster/art/bd1bf89b144c6ebc8db35e258b8e99df.jpg',
    aspectRatio: '9:16',
    keywords: ['sportbike', 'tốc độ', 'racing', 'bão tố', 'dầu nhớt', 'lốp', 'bứt tốc', 'đua xe'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 38, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#EF4444', secondary: '#1E293B', background: '#090D16' },
    recommendedFonts: ['Oswald', 'Inter'],
    useCase: 'Đua xe, dầu nhớt Racing, lốp bám đường, phụ kiện hiệu năng cao',
    aiPrompt: 'low rear chase angle of a modern sportbike speeding on a wet racetrack, dramatic motion blur on pavement, glowing red LED taillight, ominous thunderstorm clouds rolling overhead, hyper-dynamic energy --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-06',
    title: 'Black Chopper Sàn Tối Đậm',
    category: 'art',
    path: 'raw/nền poster/art/cc94fa33c225f273d035f19f40e97ba0.jpg',
    aspectRatio: '9:16',
    keywords: ['chopper', 'phụ tùng', 'thông số', 'đồ chơi xe', 'rock', 'kim loại', 'đen', 'chiaroscuro'],
    safeZone: { xMin: 10, xMax: 90, yMin: 55, yMax: 95, ctaY: 92, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#F59E0B', secondary: '#27272A', background: '#09090B' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Bảng thông số phụ tùng, đồ chơi xe máy, tiệc âm nhạc Rock/Metal',
    aiPrompt: 'extreme low ground level shot of a customized black chopper bobber motorcycle in a dark mechanic garage, overhead neon tube reflection, huge solid black negative space at bottom half, high contrast chiaroscuro --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-07',
    title: 'Dodge Challenger Khói Mờ',
    category: 'art',
    path: 'raw/nền poster/art/download.png',
    aspectRatio: '9:16',
    keywords: ['oto', 'xe hơi', 'muscle car', 'khói', 'ceramic', 'bí ẩn', 'sang trọng', 'chăm sóc xe'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 35, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#38BDF8', secondary: '#1E293B', background: '#0B0F19' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Teaser xe cơ bắp bí ẩn, chăm sóc xe Ceramic cao cấp, độ xe hơi',
    aiPrompt: 'minimalist front three-quarter view of a pitch-black American muscle car emerging from dense dark grey smoke, glowing white circular angel-eye halo headlights, studio backdrop, stealth aesthetics --ar 9:16 --v 6.0'
  },
  {
    id: 'ART-08',
    title: 'Scrambler Sân Bay Hangar',
    category: 'art',
    path: 'raw/nền poster/art/fe97f793e6399a459093fd43c36da428.jpg',
    aspectRatio: '9:16',
    keywords: ['scrambler', 'cổ điển', 'triển lãm', 'nghệ thuật', 'hangar', 'retro', 'spotlight'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 35, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FDE047', accent: '#E2E8F0', secondary: '#334155', background: '#0F172A' },
    recommendedFonts: ['Playfair Display', 'Inter'],
    useCase: 'Xe cổ Scrambler, triển lãm xe nghệ thuật, sự kiện Vintage Biker',
    aiPrompt: 'custom scrambler motorcycle under a single dramatic theatrical overhead spotlight in a vast dark industrial aircraft hangar, deep shadows, concrete floor reflection, masterpiece composition --ar 9:16 --v 6.0'
  },

  // --- NHÓM 2: MEME (Hài Hước, So Sánh & Kéo Viral) ---
  {
    id: 'MEME-01',
    title: 'Akira Kaneda Siêu Xe Đỏ',
    category: 'meme',
    path: 'raw/nền poster/meme/41e093e72401805d70e426fbd9beb9341f.jpg',
    aspectRatio: '9:16',
    keywords: ['akira', 'anime', 'cyberpunk', 'bom tấn', 'xe đỏ', 'sáng tạo', 'kaneda'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 50, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#DC2626', accent: '#0F172A', secondary: '#E2E8F0', background: '#F8FAFC' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Cyberpunk Anime, thông báo bom tấn xe thể thao, sự kiện Gen Z',
    aiPrompt: 'high angle top view, red futuristic cyberpunk anime motorcycle lying on cracked white concrete floor, biker in bright red jacket walking towards it, vast empty pale grey background at upper half for text, iconic 80s anime style --ar 9:16 --v 6.0'
  },
  {
    id: 'MEME-02',
    title: 'Patrick Bateman Thư Thái Sofa',
    category: 'meme',
    path: 'raw/nền poster/meme/4221df160789068bbd746aca73fd0edc.jpg',
    aspectRatio: '9:16',
    keywords: ['bateman', 'quý ông', 'sofa', 'thư thái', 'công sở', 'tự tin', 'sang chảnh', 'bình tĩnh'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 60, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#1C1917', accent: '#991B1B', secondary: '#78716C', background: '#F5F5F4' },
    recommendedFonts: ['Playfair Display', 'Inter'],
    useCase: 'Châm biếm công sở, tự tin phong thái quý ông, dịch vụ chăm sóc xe chu đáo',
    aiPrompt: 'a confident businessman wearing sunglasses and pinstripe suit sitting relaxed on a modern couch in an upscale office, leaning back, clean beige-grey wall with artistic palm shadow, vast negative space at top --ar 9:16 --v 6.0'
  },
  {
    id: 'MEME-03',
    title: 'Saul Goodman Nghe Điện Thoại Bầu Trời Xanh',
    category: 'meme',
    path: 'raw/nền poster/meme/5e28921ee2301c67a7e993ca9e502045.jpg',
    aspectRatio: '9:16',
    keywords: ['saul goodman', 'hotline', 'cứu hộ', '24/7', 'gấp', 'điện thoại', 'bảo hành', 'cam kết', 'uy tín'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 55, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#FACC15', secondary: '#1E3A8A', background: '#2563EB' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Hotline cứu hộ xe 24/7, cam kết giải quyết sự cố, bảo hiểm xe máy',
    aiPrompt: 'a charismatic lawyer in a brown suit with bright orange tie talking on an outdoor retro payphone, gesturing with open hand, solid vibrant cobalt blue sky filling top 60% of frame, film grain 35mm --ar 9:16 --v 6.0'
  },
  {
    id: 'MEME-04',
    title: 'Truman Show Nấc Thang Lên Trời',
    category: 'meme',
    path: 'raw/nền poster/meme/9202ff54997baac8bb7c9989f49d8a64.jpg',
    aspectRatio: '9:16',
    keywords: ['truman', 'nấc thang', 'tuyển dụng', 'bứt phá', 'năm mới', 'tương lai', 'hy vọng'],
    safeZone: { xMin: 10, xMax: 85, yMin: 5, yMax: 65, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#0F172A', accent: '#0284C7', secondary: '#38BDF8', background: '#BAE6FD' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Tuyển dụng thợ xe, bứt phá giới hạn, lời chúc đầu năm',
    aiPrompt: 'surrealist conceptual photography, a man climbing a blue minimalist staircase leading straight into a wall painted like brilliant blue sky with fluffy white clouds, inspirational, vast sky copy space --ar 9:16 --v 6.0'
  },
  {
    id: 'MEME-05',
    title: 'Drake Hotline Bling 2 Khung So Sánh',
    category: 'meme',
    path: 'raw/nền poster/meme/afd2b0fdd77aab49b5c7eab7ae7422b5.jpg',
    aspectRatio: '4:5',
    keywords: ['drake', 'so sánh', 'sai lầm', 'đúng đắn', 'trước sau', 'chọn lựa', 'nhớt giả'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 95, align: 'center' },
    recommendedColors: { text: '#18181B', accent: '#DC2626', secondary: '#16A34A', background: '#FFFFFF' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'So sánh sai lầm vs giải pháp đúng đắn (Ví dụ: Nhớt giả vs Nhớt chính hãng)',
    aiPrompt: 'clean two-panel vertical meme template split evenly, left side shows actor with expressive gestures, right side has clean solid pure white rectangular cards for typography --ar 4:5 --v 6.0'
  },
  {
    id: 'MEME-06',
    title: 'Tony Stark Ăn Bánh Donut Giữa Trời',
    category: 'meme',
    path: 'raw/nền poster/meme/c2680cb6aaaf9993fd256ce58f90beb7.jpg',
    aspectRatio: '9:16',
    keywords: ['tony stark', 'ăn uống', 'donut', 'thư giãn', 'cuối tuần', 'quà tặng', 'ưu đãi', 'iron man'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 65, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#0369A1', accent: '#B91C1C', secondary: '#F59E0B', background: '#E0F2FE' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Ưu đãi ăn uống, quà tặng bảo dưỡng cuối tuần, xả stress',
    aiPrompt: 'superhero in red and gold high-tech armor relaxing, eating a pastry while sitting inside a giant outdoor rooftop signage under a crystal-clear pale pastel blue sky, humorous, vast open sky --ar 9:16 --v 6.0'
  },
  {
    id: 'MEME-07',
    title: 'Martin Scorsese "This Is Cinema"',
    category: 'meme',
    path: 'raw/nền poster/meme/ed18a3118ac2cef84bf70c4dc640372d.jpg',
    aspectRatio: '9:16',
    keywords: ['scorsese', 'cinema', 'kiệt tác', '5 sao', 'uy tín', 'đỉnh cao', 'chất lượng'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 50, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#EAB308', secondary: '#71717A', background: '#09090B' },
    recommendedFonts: ['Playfair Display', 'Inter'],
    useCase: 'Tuyên bố kiệt tác, chứng nhận 5 sao uy tín, dịch vụ chuẩn quốc tế',
    aiPrompt: 'high contrast black and white dramatic portrait of an elderly legendary film director raising both hands in praise, pure solid black background covering upper half, chiaroscuro lighting, Leica photography --ar 9:16 --v 6.0'
  },
  {
    id: 'MEME-08',
    title: 'Tony Stark Jericho Dang Tay Bom Nổ',
    category: 'meme',
    path: 'raw/nền poster/meme/eef3e1d1c7d7b4fd94c82d43f2c65d3e.jpg',
    aspectRatio: '9:16',
    keywords: ['bão sale', 'bom nổ', 'jericho', 'khuyến mãi khủng', 'sự kiện', 'giảm sốc', 'siêu sale', 'giá sốc'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 55, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#0F172A', accent: '#DC2626', secondary: '#D97706', background: '#E2E8F0' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Bão khuyến mãi khủng, sự kiện chấn động toàn bộ phụ tùng, giảm 50%',
    aiPrompt: 'a confident billionaire CEO in tailored suit spreading arms wide with desert mountain shockwave explosion dust cloud in distant background, muted grey dusty sky above, cinematic widescreen converted to vertical --ar 9:16 --v 6.0'
  },

  // --- NHÓM 3: XE (Đường Đua, Textures & Cơ Khí Kỹ Thuật) ---
  {
    id: 'XE-01',
    title: 'Thép Gân Nhám Kim Cương (Diamond Plate)',
    category: 'xe',
    path: 'raw/nền poster/xe/13dcb8bbea70bd889867f8e3f2a01747.jpg',
    aspectRatio: '9:16',
    keywords: ['thép', 'kim loại', 'bảng giá', 'sửa xe', 'phụ tùng', 'máy móc', 'cơ khí', 'bảo dưỡng', 'nhông sên dĩa'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 95, ctaY: 92, align: 'center' },
    recommendedColors: { text: '#FACC15', accent: '#FFFFFF', secondary: '#4B5563', background: '#111827' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Bảng giá dịch vụ tiệm sửa xe, phụ tùng cơ khí nặng, dụng cụ chuyên nghiệp',
    aiPrompt: 'top down macro texture of dark industrial black diamond plate steel sheet, heavy duty metallic tread texture, subtle gunmetal sheen, dark vignette around edges, raw industrial background --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-02',
    title: 'Phông Vải Xếp Nếp Studio Đen',
    category: 'xe',
    path: 'raw/nền poster/xe/26db3ae4b9087f595ec372baf42b029f.jpg',
    aspectRatio: '9:16',
    keywords: ['nhớt', 'dầu nhớt', 'vải rủ', 'studio đen', 'sang trọng', 'pô độ', 'phụ kiện', 'lon thiếc', 'chính hãng', 'castrol', 'motul'],
    safeZone: { xMin: 15, xMax: 85, yMin: 10, yMax: 90, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#CA8A04', secondary: '#262626', background: '#0A0A0A' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Poster sản phẩm dầu nhớt cao cấp, pô titan, phụ tùng chính hãng lon thiếc',
    aiPrompt: 'luxurious dark draped black velvet muslin fabric background with soft elegant folds, moody studio lighting, smooth gradient, seamless backdrop for commercial automotive product placement --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-03',
    title: 'NASCAR Nghiêng Lốp Tốc Độ',
    category: 'xe',
    path: 'raw/nền poster/xe/2b1f5d1ebc662a49c17468bf049d1a6c.jpg',
    aspectRatio: '9:16',
    keywords: ['nascar', 'tốc độ', 'lốp xe', 'bứt tốc', 'phụ gia', 'octane', 'đua xe', 'cua gắt'],
    safeZone: { xMin: 10, xMax: 90, yMin: 5, yMax: 45, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#F59E0B', secondary: '#38BDF8', background: '#0F172A' },
    recommendedFonts: ['Oswald', 'Inter'],
    useCase: 'Giải đua bứt tốc, lốp xe bám cua, phụ gia tăng octane, dầu nhớt siêu bốc',
    aiPrompt: 'extreme low angle dynamic action shot of a racing car on a steep banked asphalt speedway track, tire tread details, radial speed motion blur, blinding sun flare in corner --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-04',
    title: 'Khúc Cua F1 Kerb Vết Lốp',
    category: 'xe',
    path: 'raw/nền poster/xe/3ea5306d8a604736a7e5c6336ae0c956.jpg',
    aspectRatio: '9:16',
    keywords: ['f1', 'kerb', 'vết lốp', 'cua xe', 'racing gp', 'test drive', 'đường đua', 'khúc cua'],
    safeZone: { xMin: 10, xMax: 90, yMin: 45, yMax: 85, ctaY: 92, align: 'center' },
    recommendedColors: { text: '#FFFFFF', accent: '#EF4444', secondary: '#F8FAFC', background: '#1E293B' },
    recommendedFonts: ['Oswald', 'Inter'],
    useCase: 'Ghép xe máy ôm cua, sự kiện lái thử xe Test Drive, dầu nhớt Racing GP',
    aiPrompt: 'empty Grand Prix Formula racing track curve with red and white striped kerbs, tire skid marks on asphalt, empty track foreground waiting for car cutout, wide open sky --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-05',
    title: 'Khói Burnout Lửa Đêm',
    category: 'xe',
    path: 'raw/nền poster/xe/3fcb619106a33025ee9311ab6ff79a23.jpg',
    aspectRatio: '9:16',
    keywords: ['burnout', 'khói lửa', 'drift', 'đêm hội', 'stunt', 'bốc đầu', 'bugi', 'pô nổ', 'lửa'],
    safeZone: { xMin: 15, xMax: 85, yMin: 15, yMax: 55, ctaY: 88, align: 'center' },
    recommendedColors: { text: '#FEF08A', accent: '#FFFFFF', secondary: '#F97316', background: '#0C0A09' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Đêm hội Biker Drift xe, bugi iridium đánh lửa siêu nhạy, ống xả độ uy lực',
    aiPrompt: 'dense burnout smoke cloud illuminated from below by fiery orange sparks and embers, wet tarmac asphalt, intense dark night atmosphere, high energy automotive performance backdrop --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-06',
    title: 'Bo Đua Đô Thị & Tòa Kính Mờ Sương',
    category: 'xe',
    path: 'raw/nền poster/xe/763c5054d6657912a1206a25fbab378b.jpg',
    aspectRatio: '9:16',
    keywords: ['xe điện', 'ev', 'đô thị', 'xanh', 'môi trường', 'sương mù', 'thông minh', 'scooter'],
    safeZone: { xMin: 10, xMax: 90, yMin: 35, yMax: 85, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#0F172A', accent: '#047857', secondary: '#4E6B66', background: '#F8FAFC' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Ra mắt xe máy điện EV thông minh, giao thông xanh, bảo dưỡng hiện đại',
    aiPrompt: 'sleek asphalt racetrack curving in foreground with red-white curbs, modern glass skyscrapers and city skyline in soft misty morning teal green light, modern EV future mobility vibe --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-07',
    title: 'Phông Xám Studio Loang Cổ Điển (Mottled Muslin)',
    category: 'xe',
    path: 'raw/nền poster/xe/d195928c07d6d703230894d3f1dedaa2.jpg',
    aspectRatio: '9:16',
    keywords: ['phụ tùng cnc', 'sên dĩa', 'thanh lịch', 'minimalist', 'studio xám', 'chất lượng', 'xi măng'],
    safeZone: { xMin: 10, xMax: 90, yMin: 10, yMax: 90, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#18181B', accent: '#D97706', secondary: '#52525B', background: '#A1A1AA' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Chụp phụ tùng CNC, cùm tay thắng cao cấp, phong cách Nordic Minimalist',
    aiPrompt: 'classic mottled grey fine art photography canvas backdrop, soft subtle cloudy texture, neutral concrete slate tone, subtle center spotlight vignette, perfect commercial studio stage --ar 9:16 --v 6.0'
  },
  {
    id: 'XE-08',
    title: 'Ma Trận Lưới Số Cyber Grid (Blueprint)',
    category: 'xe',
    path: 'raw/nền poster/xe/download.png',
    aspectRatio: '9:16',
    keywords: ['cyber grid', 'hud', 'blueprint', 'remap', 'ecu', 'dyno', 'công nghệ', 'thông số', 'kỹ thuật'],
    safeZone: { xMin: 10, xMax: 90, yMin: 10, yMax: 90, ctaY: 90, align: 'center' },
    recommendedColors: { text: '#22D3EE', accent: '#FFFFFF', secondary: '#083344', background: '#020617' },
    recommendedFonts: ['Montserrat', 'Inter'],
    useCase: 'Remap mở tua ECU máy tính, Dyno Tuning công suất, thông số kỹ thuật 4.0',
    aiPrompt: 'clean glowing cyan digital wireframe perspective grid on dark navy blue to black gradient background, automotive telemetry HUD blueprint aesthetics, tech sci-fi banner --ar 9:16 --v 6.0'
  }
];

/**
 * 10 KỸ THUẬT THIẾT KẾ POSTER PHỔ BIẾN
 * Đồng bộ từ Obsidian Vault (wiki/10 Kỹ Thuật Thiết Kế Poster Phổ Biến)
 */
const POSTER_TECHNIQUES = [
  {
    id: 'TECH-01',
    name: 'Cắt Ảnh & Xếp Lớp (Image Collage & Layering)',
    slug: 'image_collage_layering',
    category: 'collage',
    coreEssence: 'Tạo chiều sâu 3D bằng cấu trúc 3 tầng: Foreground (badge, sticker, text overlay), Midground (chủ thể tách nền sắc nét), Background (không gian nền có chiều sâu).',
    recommendedLayouts: ['diagonal_motion', 'editorial_split'],
    recommendedFonts: { headline: 'Oswald', body: 'Inter' },
    recommendedAspectRatios: ['4:5', '9:16', '2:3'],
    recommendedBackdropIds: ['XE-01', 'XE-04', 'XE-05', 'ART-02'],
    colorStrategy: 'Tương phản mạnh giữa các lớp, tạo bóng đổ (contact shadow) và vệt sáng viền (backlight aura).'
  },
  {
    id: 'TECH-02',
    name: 'Quan Điểm / Góc Nhìn Độc Đáo (Unique Perspective & Framing)',
    slug: 'unique_perspective_framing',
    category: 'perspective',
    coreEssence: 'Thoát khỏi góc nhìn ngang tầm mắt (Eye-level). Dùng góc ngước mắt giun (Worm\'s-eye view), góc nhìn từ trên cao (Bird\'s-eye view) hoặc góc nghiêng kịch tính (Dutch angle).',
    recommendedLayouts: ['frame_within_frame', 'hero_center'],
    recommendedFonts: { headline: 'Montserrat', body: 'Inter' },
    recommendedAspectRatios: ['9:16', '4:5', '2:3'],
    recommendedBackdropIds: ['ART-03', 'ART-05', 'MEME-01', 'XE-03'],
    colorStrategy: 'Tận dụng đường dẫn thị giác (leading lines) và khoảng trời/khung tòa nhà để đóng khung tiêu đề.'
  },
  {
    id: 'TECH-03',
    name: 'Áp Phích Văn Bản & Nghệ Thuật Chữ (Typography as Visual Art)',
    slug: 'typography_as_art',
    category: 'typography',
    coreEssence: 'Chữ chính là Key Visual nghệ thuật chủ đạo. Tiêu đề in hoa kích thước lớn (oversized), phân cấp rõ rệt 3 tầng thị giác, kết hợp font tương phản cao.',
    recommendedLayouts: ['asymmetric_grid', 'editorial_split'],
    recommendedFonts: { headline: 'Montserrat', body: 'Inter' },
    recommendedAspectRatios: ['4:5', '9:16', '1:1', '2:3'],
    recommendedBackdropIds: ['XE-07', 'XE-08', 'ART-06'],
    colorStrategy: 'Headline tương phản cực mạnh với nền (trắng/vàng gold trên nền tối, hoặc đen tuyền trên nền sáng).'
  },
  {
    id: 'TECH-04',
    name: 'Loại Bỏ Chi Tiết Thừa & Tối Giản (Minimalism & Negative Space)',
    slug: 'minimalism_negative_space',
    category: 'minimalism',
    coreEssence: 'Triết lý "Less is more". Sử dụng khoảng thở (Negative Space) rộng lớn để tạo lực hút thị giác tối đa vào duy nhất 1 chủ thể hoặc 1 thông điệp đắt giá.',
    recommendedLayouts: ['bottom_stage', 'hero_center'],
    recommendedFonts: { headline: 'Playfair Display', body: 'Plus Jakarta Sans' },
    recommendedAspectRatios: ['4:5', '1:1', '9:16'],
    recommendedBackdropIds: ['XE-02', 'XE-07', 'ART-01'],
    colorStrategy: 'Bảng màu tối giản 2-3 màu cao cấp, không gian nền đen nhung, xám xi măng loang hoặc trắng kem.'
  },
  {
    id: 'TECH-05',
    name: 'Phong Cách Cổ Điển Hoài Niệm (Retro & Vintage Aesthetic)',
    slug: 'retro_vintage',
    category: 'retro',
    coreEssence: 'Tái hiện cảm xúc thẩm mỹ thập niên 50-80: Tone màu giảm bão hòa (muted), vàng giấy ố, film grain, đường nét mộc mạc và chân thực.',
    recommendedLayouts: ['frame_within_frame', 'editorial_split'],
    recommendedFonts: { headline: 'Abril Fatface', body: 'Lora' },
    recommendedAspectRatios: ['4:5', '2:3', '1:1'],
    recommendedBackdropIds: ['ART-04', 'ART-08', 'ART-02'],
    colorStrategy: 'Tone màu ấm: nâu đất, vàng hổ phách, be giấy cũ, cam san hô.'
  },
  {
    id: 'TECH-06',
    name: 'Phóng Đại & Cường Điệu Thị Giác (Visual Exaggeration & Surrealism)',
    slug: 'visual_exaggeration_surrealism',
    category: 'surrealism',
    coreEssence: 'Phá vỡ tỷ lệ thực tế, tương phản siêu thực giữa vùng tối sâu thẳm và dải neon huỳnh quang chói lòa hoặc hiệu ứng bão nổ chấn động.',
    recommendedLayouts: ['hero_center', 'diagonal_motion'],
    recommendedFonts: { headline: 'Orbitron', body: 'Space Grotesk' },
    recommendedAspectRatios: ['9:16', '4:5'],
    recommendedBackdropIds: ['MEME-08', 'XE-05', 'XE-08'],
    colorStrategy: 'Neon Carbon: Đen carbon #0B0F17 kết hợp Xanh Cyan Neon #00FFFF, Đỏ lửa #EF4444 hoặc Vàng rực.'
  },
  {
    id: 'TECH-07',
    name: 'Đồ Họa & Văn Bản Bổ Trợ Nhau (Graphic-Text Harmony & Balance)',
    slug: 'graphic_text_harmony',
    category: 'balance',
    coreEssence: 'Quy luật Gestalt về cân bằng trọng lượng thị giác (Visual Weight). Khối hình ảnh và khối thông tin chữ nâng đỡ nhau, mắt lướt mượt mà không bị lệch trọng tâm.',
    recommendedLayouts: ['editorial_split', 'asymmetric_grid'],
    recommendedFonts: { headline: 'Montserrat', body: 'Inter' },
    recommendedAspectRatios: ['4:5', '1:1', '16:9', '2:3'],
    recommendedBackdropIds: ['ART-06', 'XE-06', 'MEME-02'],
    colorStrategy: 'Quy tắc 60-30-10: 60% màu nền, 30% cấu trúc phụ, 10% điểm nhấn bắt mắt cho CTA.'
  },
  {
    id: 'TECH-08',
    name: 'Dùng Ảnh Thực Tế Tăng Độ Uy Tín (Authentic Photography & Social Proof)',
    slug: 'authentic_photography',
    category: 'photography',
    coreEssence: 'Khai thác sức mạnh của tính chân thực: Ảnh chụp thật của sản phẩm, chi tiết kim loại bóng loáng, giọt dầu nhớt trong suốt, tem nhãn sắc nét tạo lòng tin tuyệt đối.',
    recommendedLayouts: ['hero_center', 'editorial_split'],
    recommendedFonts: { headline: 'Inter', body: 'Be Vietnam Pro' },
    recommendedAspectRatios: ['4:5', '9:16', '1:1'],
    recommendedBackdropIds: ['XE-02', 'XE-07', 'MEME-07'],
    colorStrategy: 'Corporate Trust: Nền tối studio hoặc trắng tinh khôi, điểm nhấn Xanh Dodger #1E90FF hoặc Vàng Gold.'
  },
  {
    id: 'TECH-09',
    name: 'Phong Cách Minh Họa Nghệ Thuật (Custom Illustration & Artistic Expression)',
    slug: 'custom_illustration',
    category: 'illustration',
    coreEssence: 'Nét vẽ đồ họa độc bản, truyền tải cảm xúc thân thiện, kể chuyện (Storytelling), phá vỡ sự cứng nhắc của các bức ảnh thương mại thông thường.',
    recommendedLayouts: ['asymmetric_grid', 'diagonal_motion'],
    recommendedFonts: { headline: 'Baloo 2', body: 'Nunito' },
    recommendedAspectRatios: ['4:5', '9:16', '1:1'],
    recommendedBackdropIds: ['MEME-04', 'MEME-01'],
    colorStrategy: 'Festive Pop: Tươi vui, rực rỡ, độ bão hòa cao, năng động.'
  },
  {
    id: 'TECH-10',
    name: 'Chuỗi Áp Phích Đồng Nhất (Poster Series System)',
    slug: 'poster_series_system',
    category: 'series',
    coreEssence: 'Thiết kế chiến dịch đa kênh: Giữ bất biến (Constants) hệ thống lưới, font chữ, vị trí logo và CTA; chỉ thay đổi biến thiên (Variables) sản phẩm và màu sắc chủ đạo.',
    recommendedLayouts: ['editorial_split', 'hero_center'],
    recommendedFonts: { headline: 'Montserrat', body: 'Inter' },
    recommendedAspectRatios: ['4:5', '9:16', '2:3'],
    recommendedBackdropIds: ['ART-01', 'ART-02', 'ART-04', 'XE-01', 'XE-02'],
    colorStrategy: 'Hệ thống màu đồng bộ theo dòng sản phẩm hoặc mùa chiến dịch.'
  }
];

class ObsidianPosterService {
  /**
   * Get all 10 Poster Design Techniques
   */
  getTechniques() {
    return POSTER_TECHNIQUES;
  }

  /**
   * Get technique by ID (e.g. TECH-01) or slug
   */
  getTechniqueById(idOrSlug) {
    if (!idOrSlug) return null;
    const q = String(idOrSlug).toLowerCase();
    return POSTER_TECHNIQUES.find(t => t.id.toLowerCase() === q || t.slug.toLowerCase() === q) || null;
  }

  /**
   * Match best Poster Technique based on brief and preferences
   */
  matchTechnique(brief = '', preferences = {}) {
    const text = `${brief} ${preferences.industry || ''} ${preferences.mood || ''} ${preferences.style || ''}`.toLowerCase();
    
    if (/(?:layer|cắt|xếp lớp|nhiều tầng|3d|depth)/i.test(text)) return this.getTechniqueById('TECH-01');
    if (/(?:góc nhìn|mắt giun|trên cao|nghiêng|độc đáo|perspective)/i.test(text)) return this.getTechniqueById('TECH-02');
    if (/(?:typography|nghệ thuật chữ|chữ lớn|headline|font)/i.test(text)) return this.getTechniqueById('TECH-03');
    if (/(?:tối giản|minimal|khoảng trắng|negative space|ít hơn là nhiều)/i.test(text)) return this.getTechniqueById('TECH-04');
    if (/(?:cổ điển|retro|vintage|hoài niệm|nâu đất|film grain)/i.test(text)) return this.getTechniqueById('TECH-05');
    if (/(?:phóng đại|cường điệu|siêu thực|bão sale|bom nổ|neon)/i.test(text)) return this.getTechniqueById('TECH-06');
    if (/(?:cân bằng|gestalt|hài hòa|bổ trợ|tỷ lệ vàng)/i.test(text)) return this.getTechniqueById('TECH-07');
    if (/(?:thực tế|chụp thật|uy tín|chân thực|bảo chứng|authentic)/i.test(text)) return this.getTechniqueById('TECH-08');
    if (/(?:minh họa|vẽ|illustration|hoạt hình|dễ thương|trẻ em)/i.test(text)) return this.getTechniqueById('TECH-09');
    if (/(?:chuỗi|series|đồng nhất|bộ sưu tập|chiến dịch)/i.test(text)) return this.getTechniqueById('TECH-10');

    // Default intelligent mapping by mood/industry
    if (/(?:sport|thể thao|racing|xe|tốc độ)/i.test(text)) return this.getTechniqueById('TECH-01');
    if (/(?:luxury|cao cấp|sang|trang sức|đồng hồ)/i.test(text)) return this.getTechniqueById('TECH-04');
    if (/(?:công nghệ|tech|ai|code|data)/i.test(text)) return this.getTechniqueById('TECH-06');
    if (/(?:khuyến mãi|sale|giảm giá)/i.test(text)) return this.getTechniqueById('TECH-06');
    if (/(?:cà phê|trà|ẩm thực|truyền thống)/i.test(text)) return this.getTechniqueById('TECH-05');

    return this.getTechniqueById('TECH-01');
  }

  /**
   * Get all Obsidian backdrops, optionally filtered by category
   */
  getBackdrops(category) {
    if (!category || category === 'all') {
      return OBSIDIAN_BACKDROPS.map(item => this._formatBackdrop(item));
    }
    return OBSIDIAN_BACKDROPS.filter(item => item.category === category).map(item => this._formatBackdrop(item));
  }

  /**
   * Get backdrop by ID (e.g. XE-01, ART-04)
   */
  getBackdropById(id) {
    if (!id) return null;
    const found = OBSIDIAN_BACKDROPS.find(item => item.id.toUpperCase() === id.toUpperCase());
    return found ? this._formatBackdrop(found) : null;
  }

  /**
   * Format backdrop with direct API route URL
   */
  _formatBackdrop(item) {
    const encodedPath = item.path.split('/').map(p => encodeURIComponent(p)).join('/');
    return {
      ...item,
      url: `/api/github/raw?path=${encodedPath}`,
      obsidianPath: item.path,
      source: 'obsidian_vault'
    };
  }

  /**
   * Get a random backdrop from the 'xe' (Xe & cơ khí) category
   */
  getRandomXeBackdrop() {
    const xeBackdrops = this.getBackdrops('xe');
    if (!xeBackdrops || xeBackdrops.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * xeBackdrops.length);
    return xeBackdrops[randomIndex];
  }

  /**
   * Derive price tag text from brief or copy
   */
  deriveProductPrice(brief = '', copy = {}) {
    if (copy.price && String(copy.price).trim()) {
      const p = String(copy.price).trim();
      return p.toUpperCase().includes('GIÁ') ? p : `GIÁ: ${p}`;
    }
    const text = `${brief || ''} ${copy.badge || ''} ${copy.subtitle || ''}`;
    const priceMatch = text.match(/(?:giá\s*(?:chỉ|bán)?\s*[:\s]*)?(\d{1,3}(?:[.,]\d{3})*(?:\s*(?:k|đ|vnd|vnđ|d|đồng))|\d+\s*(?:k|đ|vnd|vnđ|d|đồng))/i);
    if (priceMatch) {
      const p = priceMatch[1].trim().toUpperCase();
      return p.startsWith('GIÁ') ? p : `GIÁ CHỈ: ${p}`;
    }
    return copy.badge || copy.eyebrow || 'GIÁ ƯU ĐÃI HÔM NAY';
  }

  /**
   * Derive a brief product description / summary placed under the product image
   */
  deriveProductSummary(brief = '', copy = {}, preferences = {}) {
    if (copy.productSummary && copy.productSummary.trim()) return copy.productSummary.trim();
    if (copy.description && copy.description.trim()) return copy.description.trim();
    if (copy.summary && copy.summary.trim()) return copy.summary.trim();
    if (preferences.productSummary && preferences.productSummary.trim()) return preferences.productSummary.trim();

    const raw = (brief || '').trim();
    if (raw) {
      const sentences = raw.split(/[.\n;]/).map(s => s.trim()).filter(Boolean);
      for (const sentence of sentences) {
        if (sentence.length >= 15 && !/^(hãy|thiết kế|tạo|làm|vẽ|poster)/i.test(sentence)) {
          return sentence.charAt(0).toUpperCase() + sentence.slice(1);
        }
      }
    }

    if (copy.subtitle && copy.subtitle.trim().length >= 15) {
      return copy.subtitle.trim();
    }

    return 'Dòng sản phẩm chuyên dụng cao cấp, tối ưu hiệu năng & độ bền vượt trội trên mọi hành trình.';
  }

  /**
   * Match best Obsidian backdrop based on user brief, category, and preferences
   */
  matchBackdrop(brief = '', preferences = {}) {
    const text = `${brief} ${preferences.industry || ''} ${preferences.mood || ''} ${preferences.style || ''}`.toLowerCase();
    
    // Explicit random Xe request
    if (preferences.randomXe || preferences.randomBackdrop) {
      const randomBd = this.getRandomXeBackdrop();
      if (randomBd) {
        return {
          backdrop: this._formatBackdrop(randomBd),
          score: 100,
          matchedKeywords: ['random_xe'],
          technique: null
        };
      }
    }

    const matchedTechnique = preferences.techniqueId
      ? this.getTechniqueById(preferences.techniqueId)
      : this.matchTechnique(brief, preferences);

    let bestMatch = null;
    let highestScore = -1;

    for (const item of OBSIDIAN_BACKDROPS) {
      let score = 0;

      // Check keyword overlap
      for (const kw of item.keywords) {
        if (text.includes(kw)) {
          score += 5;
        }
      }

      // Boost by matched technique's recommended backdrops
      if (matchedTechnique && matchedTechnique.recommendedBackdropIds?.includes(item.id)) {
        score += 12;
      }

      // Check category affinity
      const isMeme = /(?:hài|vui|so sánh|meme|drake|bão sale|bom nổ|hotline|cứu hộ)/i.test(text);
      const isArt = /(?:nghệ thuật|phượt|bầu trời|cao ốc|biker rừng|hầm xe|triển lãm|vintage)/i.test(text);
      const isCarOrBike = /(?:xe|xe máy|oto|motor|bike|phụ tùng|bảo dưỡng|gara|sửa xe|racing|đua xe|cơ khí|nhớt|dầu|máy móc|thiết bị)/i.test(text);

      if (item.category === 'meme' && isMeme) {
        score += 25;
      } else if (item.category === 'art' && isArt) {
        score += 20;
      } else if (item.category === 'xe') {
        // Strongly prioritize Xe & Cơ khí category by default
        score += isCarOrBike ? 18 : 8;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // Default intelligently across categories if no direct keyword match
    if (!bestMatch || highestScore <= 0) {
      if (/(?:fashion|thời trang|beauty|mỹ phẩm|luxury|cao cấp|sang trọng|đồng hồ)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-02'); // Vải rủ studio đen cao cấp
      } else if (/(?:sale|khuyến mãi|giảm giá|ưu đãi|giá sốc|black friday)/i.test(text)) {
        bestMatch = this.getBackdropById('MEME-08'); // Tony Stark bão sale bom nổ
      } else if (/(?:so sánh|trước sau|sai lầm|đúng đắn)/i.test(text)) {
        bestMatch = this.getBackdropById('MEME-05'); // Drake 2 khung
      } else if (/(?:công nghệ|tech|ai|phần mềm|data|crypto|code)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-08'); // Cyber grid blueprint
      } else if (/(?:cà phê|coffee|trà|vintage|retro|hoài niệm|nâu)/i.test(text)) {
        bestMatch = this.getBackdropById('ART-04'); // Cruiser sa mạc hoàng hôn
      } else if (/(?:tối giản|minimal|sạch|nghệ thuật|fine art)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-07'); // Phông xám studio loang
      } else if (/(?:khát vọng|vươn cao|tuyển dụng|doanh nghiệp|hàng không)/i.test(text)) {
        bestMatch = this.getBackdropById('ART-03'); // Tòa chọc trời sương mù
      } else if (/(?:thể thao|tốc độ|racing|sport)/i.test(text)) {
        bestMatch = this.getBackdropById('ART-05'); // Sportbike bão tố
      } else if (/(?:nhớt|dầu|bảo dưỡng|shop|sản phẩm)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-02');
      } else if (/(?:xe|thép|sửa|cơ khí)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-01');
      } else {
        bestMatch = this.getRandomXeBackdrop() || this.getBackdropById('XE-02');
      }
    }

    return {
      backdrop: this._formatBackdrop(bestMatch),
      score: highestScore,
      matchedKeywords: bestMatch.keywords.filter(k => text.includes(k)),
      technique: matchedTechnique ? { id: matchedTechnique.id, name: matchedTechnique.name } : null
    };
  }

  /**
   * Build complete json:poster-config from an Obsidian backdrop according to
  /**
   * Derive product-centric headline from brief or product context
   */
  deriveProductHeadline(brief = '', copy = {}, preferences = {}) {
    if (copy.title && copy.title.trim()) return copy.title.trim();
    if (copy.productName && copy.productName.trim()) return copy.productName.trim();
    if (preferences.productName && preferences.productName.trim()) return preferences.productName.trim();

    const raw = (brief || '').split(/[.!?;:\n]/)[0].trim();
    if (!raw) return 'SẢN PHẨM CHÍNH HÃNG';

    // Remove common command prefixes
    let cleaned = raw
      .replace(/^(hãy\s+)?(thiết kế|tạo|làm|vẽ|lên ý tưởng)\s+(một\s+)?/i, '')
      .replace(/^(một\s+)?(poster|banner|ảnh|hình ảnh|ấn phẩm)\s+(quảng cáo\s+)?/i, '')
      .replace(/^(giới thiệu|ra mắt|quảng bá|chào đón|bán|ưu đãi|sale)\s+/i, '')
      .trim();

    // Extract core subject before "cho", "dành cho"
    const parts = cleaned.split(/\s+(?:dành\s+)?cho\s+/i);
    if (parts.length > 1 && parts[0].trim().length >= 4) {
      return parts[0].trim().split(/\s+/).slice(0, 6).join(' ');
    }

    const words = cleaned.split(/\s+/).filter(Boolean);
    const filteredWords = words.filter(w => !/^(hãy|thiết|kế|tạo|làm|một|poster|ảnh|banner|quảng|cáo)$/i.test(w));
    const candidate = (filteredWords.length > 0 ? filteredWords : words).slice(0, 6).join(' ');
    return candidate || 'SẢN PHẨM CHÍNH HÃNG';
  }

  /**
   * Build complete json:poster-config from an Obsidian backdrop according to
   * the 5-step rules in wiki/Kho Mẫu Nền Poster/02. Cẩm Nang Thực Chiến & Công Thức Thiết Kế Poster.md,
   * Bảng Mã Màu HTML CSS RGB CMYK (60-30-10), and 10 Poster Design Techniques
   */
  buildPosterConfig({ backdrop, brief = '', copy = {}, productImageUrl = null, options = {} }) {
    // If backdrop not provided, select random backdrop from 'xe' category (Xe & cơ khí)
    const bd = backdrop || (options.randomXe !== false ? this.getRandomXeBackdrop() : null) || this.getBackdropById('XE-02');
    const safeZone = bd.safeZone || { xMin: 15, xMax: 85, yMin: 10, yMax: 90, align: 'center', ctaY: 90 };
    
    // Resolve Obsidian Color Palette from Vault (60-30-10 Golden Rule)
    const matchedHarmony = (options.preferences?.harmonyId || options.harmonyId)
      ? obsidianColorService.getHarmonyById(options.preferences?.harmonyId || options.harmonyId)
      : obsidianColorService.matchHarmony(brief, options.preferences || {});
    const harmony = matchedHarmony || obsidianColorService.getHarmonies()[0];

    const colors = {
      text: harmony.textColors?.headline || bd.recommendedColors?.text || '#FFFFFF',
      subtext: harmony.textColors?.subtext || bd.recommendedColors?.accent || '#FFD700',
      accent: harmony.rule10?.hex || bd.recommendedColors?.accent || '#FFD700',
      secondary: harmony.rule30?.hex || bd.recommendedColors?.secondary || '#334155',
      background: harmony.rule60?.hex || bd.recommendedColors?.background || '#0B0F19',
      badgeBg: harmony.textColors?.badge || harmony.rule10?.hex || '#FFD700',
      badgeText: harmony.textColors?.badgeText || '#020617',
      ctaBg: harmony.textColors?.ctaBg || harmony.rule10?.hex || '#FFD700',
      ctaText: harmony.textColors?.ctaText || '#020617'
    };
    
    // Resolve technique and font pairing
    const technique = options.techniqueId
      ? this.getTechniqueById(options.techniqueId)
      : this.matchTechnique(brief, options.preferences || {});
    const fonts = (technique && technique.recommendedFonts)
      ? [technique.recommendedFonts.headline, technique.recommendedFonts.body]
      : (bd.recommendedFonts || ['Montserrat', 'Inter']);

    // Aspect ratio resolution (Default 9:16 1080x1920)
    const aspectRatio = options.aspectRatio || bd.aspectRatio || '9:16';
    const DIMENSIONS = {
      '1:1': [1080, 1080],
      '4:5': [1080, 1350],
      '9:16': [1080, 1920],
      '16:9': [1920, 1080],
      '2:3': [1200, 1800]
    };
    const [canvasWidth, canvasHeight] = DIMENSIONS[aspectRatio] || [1080, 1920];

    // Product-centric title & copy resolution
    const title = copy.title || this.deriveProductHeadline(brief, copy, options.preferences || {});
    const subtitle = copy.subtitle || 'Dòng sản phẩm cao cấp - Bảo vệ tối ưu trên mọi hành trình';
    const priceText = this.deriveProductPrice(brief, copy);
    const badge = copy.badge || priceText || 'MỚI VỀ HÀNG';
    const productSummary = this.deriveProductSummary(brief, copy, options.preferences || {});
    const cta = copy.cta || 'MUA NGAY TẠI SHOP';
    const features = options.features || '⚡ Bôi trơn siêu cấp  |  🔥 Tản nhiệt cực nhanh  |  🛡️ Bảo vệ động cơ 24/7';

    // All Typography strictly center-aligned to guarantee balanced weight and prevent text clipping
    const isAlignLeft = Boolean(safeZone.align === 'left');
    const textX = 50;
    const textAlign = 'center';

    const layers = [
      // 1. Gradient Masking to guarantee text legibility
      {
        id: 'gradient_mask_top',
        type: 'shape',
        shape: 'rect',
        x: 50,
        y: 20,
        width: 100,
        height: 40,
        fill: colors.background || '#000000',
        opacity: 0.40
      },
      // 2. Realistic Contact Shadow under product base (NO circular glow/aura behind product)
      {
        id: 'contact_shadow',
        type: 'shape',
        shape: 'ellipse',
        x: 50,
        y: 83,
        width: 58,
        height: 3.5,
        fill: '#000000',
        opacity: 0.60
      },
      // 3. Main Product Subject - Hero product scaling (Nằm bên dưới Headline: y: 56%)
      {
        id: 'main_subject',
        type: 'image',
        url: productImageUrl || null,
        x: 50,
        y: 56,
        width: 84,
        height: 66,
        fit: 'contain',
        removeBackground: true,
        adjustments: {
          brightness: 6,
          contrast: 15,
          saturation: 10,
          sharpen: 50
        }
      },
      // 4. Price Badge Pill (Nằm ở TRÊN Headline: y: safeZone.yMin + 2 ~ 12%)
      {
        id: 'price_badge_bg',
        type: 'shape',
        shape: 'roundedRect',
        x: textX,
        y: safeZone.yMin + 2,
        width: 44,
        height: 5.8,
        fill: colors.badgeBg,
        cornerRadius: 20
      },
      {
        id: 'price_badge_text',
        type: 'text',
        text: priceText.toUpperCase(),
        x: textX,
        y: safeZone.yMin + 2,
        width: 44,
        height: 5.8,
        fontFamily: fonts[0],
        fontWeight: 800,
        fontSize: 34,
        color: colors.badgeText,
        align: 'center'
      },
      // 5. Headline 86px (NẰM CHÍNH GIỮA GIÁ TIỀN VÀ ẢNH SẢN PHẨM: y: safeZone.yMin + 12 ~ 22%)
      {
        id: 'headline',
        type: 'text',
        text: title.toUpperCase(),
        x: textX,
        y: safeZone.yMin + 12,
        width: 90,
        height: 14,
        fontFamily: fonts[0],
        fontWeight: 900,
        fontSize: 86,
        color: colors.text,
        align: 'center',
        shadow: {
          color: 'rgba(0, 0, 0, 0.85)',
          blur: 20,
          offsetX: 0,
          offsetY: 4
        }
      },
      // 6. Subtitle (Tier 2 visual hierarchy - Center Aligned)
      {
        id: 'subtitle',
        type: 'text',
        text: subtitle,
        x: textX,
        y: safeZone.yMin + 21,
        width: 88,
        height: 7,
        fontFamily: fonts[1],
        fontWeight: 600,
        fontSize: 20,
        color: colors.subtext,
        align: 'center'
      },
      // 7. Chữ giới thiệu sơ lược về sản phẩm (NẰM Ở DƯỚI HÌNH ẢNH SẢN PHẨM)
      {
        id: 'product_summary',
        type: 'text',
        text: productSummary,
        x: 50,
        y: 84,
        width: 88,
        height: 5.5,
        fontFamily: fonts[1],
        fontWeight: 600,
        fontSize: 20,
        color: '#F8FAFC',
        align: 'center',
        shadow: {
          color: 'rgba(0, 0, 0, 0.85)',
          blur: 16,
          offsetX: 0,
          offsetY: 3
        }
      },
      // 8. Feature bullet points (Tier 3 - Center Aligned)
      {
        id: 'features',
        type: 'text',
        text: features,
        x: 50,
        y: (safeZone.ctaY || 92) - 5,
        width: 90,
        height: 4.5,
        fontFamily: fonts[1],
        fontWeight: 500,
        fontSize: 15,
        color: '#E2E8F0',
        align: 'center'
      },
      // 9. Call To Action Button (Center Aligned)
      {
        id: 'cta_bg',
        type: 'shape',
        shape: 'roundedRect',
        x: 50,
        y: safeZone.ctaY || 92,
        width: 38,
        height: 5.6,
        fill: colors.ctaBg,
        cornerRadius: 28
      },
      {
        id: 'cta_label',
        type: 'text',
        text: cta.toUpperCase(),
        x: 50,
        y: safeZone.ctaY || 92,
        width: 38,
        height: 5.6,
        fontFamily: fonts[0],
        fontWeight: 800,
        fontSize: 18,
        color: colors.ctaText,
        align: 'center'
      }
    ];

    return {
      schemaVersion: '3.0',
      source: 'obsidian_vault',
      backdropId: bd.id,
      backdropTitle: bd.title,
      style: `obsidian_${bd.category}`,
      styleLabel: `Obsidian: ${bd.title}`,
      layout: isAlignLeft ? 'editorial_split' : 'hero_center',
      preset: aspectRatio,
      paletteId: harmony.id,
      paletteName: harmony.name,
      paletteRules: {
        rule60: harmony.rule60,
        rule30: harmony.rule30,
        rule10: harmony.rule10
      },
      technique: technique ? {
        id: technique.id,
        name: technique.name,
        slug: technique.slug,
        category: technique.category,
        coreEssence: technique.coreEssence,
        recommendedFonts: technique.recommendedFonts,
        colorStrategy: technique.colorStrategy
      } : null,
      title,
      subtitle,
      badge,
      productSummary,
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
        safeMarginPercent: 6,
        background: {
          type: 'template',
          url: bd.url,
          title: bd.title,
          obsidianPath: bd.path
        },
        backdrop: bd.url
      },
      keyVisual: {
        mode: 'obsidian_trained_asset',
        prompt: bd.aiPrompt,
        negativePrompt: 'words, letters, numbers, logo, watermark, clutter',
        role: 'background_and_key_visual'
      },
      layers,
      publishing: {
        productCaption: `🔥 ${title} 🔥\n\n✨ ${subtitle}\n\n⚡ Lợi ích & Tính năng nổi bật:\n${features.split('•').map(f => `🔹 ${f.trim()}`).filter(Boolean).join('\n')}\n\n💰 Giá ưu đãi: Liên hệ Shop ngay để nhận báo giá tốt nhất hôm nay!\n🎁 Ưu đãi đặc biệt: Hỗ trợ tư vấn kỹ thuật & giao hàng nhanh chóng\n🛡️ Cam kết: Hàng chính hãng 100% - Bảo hành đầy đủ\n\n👉 Nhắn tin ngay cho Shop hoặc để lại bình luận để đặt hàng!`,
        hashtags: ['#Daunhotchinhhang', '#Phutungxe', '#ChamSocXe', '#GiaTot', `#${bd.category.toUpperCase()}`]
      }
    };
  }
}

module.exports = new ObsidianPosterService();
