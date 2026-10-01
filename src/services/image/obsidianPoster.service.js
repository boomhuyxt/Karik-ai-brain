/**
 * Obsidian Poster Service
 * Integrates knowledge and poster background assets trained in Admin's Obsidian Vault
 * (wiki/Kho Mẫu Nền Poster, wiki/10 Kỹ Thuật Thiết Kế Poster Phổ Biến, wiki/36 Ý Tưởng Thiết Kế Poster Sáng Tạo)
 */

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
    safeZone: { xMin: 10, xMax: 60, yMin: 5, yMax: 45, ctaY: 86, align: 'left' },
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
    safeZone: { xMin: 52, xMax: 95, yMin: 5, yMax: 95, align: 'left' },
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
    safeZone: { xMin: 45, xMax: 95, yMin: 5, yMax: 45, ctaY: 88, align: 'left' },
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

class ObsidianPosterService {
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
   * Match best Obsidian backdrop based on user brief, category, and preferences
   */
  matchBackdrop(brief = '', preferences = {}) {
    const text = `${brief} ${preferences.industry || ''} ${preferences.mood || ''}`.toLowerCase();

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

      // Check category affinity
      const isCarOrBike = /(?:xe|xe máy|oto|motor|bike|phụ tùng|bảo dưỡng|gara|sửa xe|racing|đua xe)/i.test(text);
      if (item.category === 'xe' && isCarOrBike) {
        score += 8;
      }
      if (item.category === 'meme' && /(?:hài|vui|so sánh|meme|drake|bão sale|bom nổ)/i.test(text)) {
        score += 10;
      }
      if (item.category === 'art' && /(?:nghệ thuật|phượt|bầu trời|cao ốc|biker rừng|hầm xe)/i.test(text)) {
        score += 8;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // Default to XE-02 (luxury black studio) if automotive/product, or XE-01 if mechanical, or ART-01
    if (!bestMatch || highestScore <= 0) {
      if (/(?:nhớt|dầu|bảo dưỡng|shop|sản phẩm)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-02');
      } else if (/(?:xe|thép|sửa)/i.test(text)) {
        bestMatch = this.getBackdropById('XE-01');
      } else {
        bestMatch = this.getBackdropById('ART-01');
      }
    }

    return {
      backdrop: this._formatBackdrop(bestMatch),
      score: highestScore,
      matchedKeywords: bestMatch.keywords.filter(k => text.includes(k))
    };
  }

  /**
   * Build complete json:poster-config from an Obsidian backdrop according to
   * the 5-step rules in wiki/Kho Mẫu Nền Poster/02. Cẩm Nang Thực Chiến & Công Thức Thiết Kế Poster.md
   */
  buildPosterConfig({ backdrop, brief = '', copy = {}, productImageUrl = null, options = {} }) {
    const bd = backdrop || this.getBackdropById('XE-02');
    const safeZone = bd.safeZone || { xMin: 15, xMax: 85, yMin: 10, yMax: 90, align: 'center', ctaY: 90 };
    const colors = bd.recommendedColors || { text: '#FFFFFF', accent: '#F59E0B', secondary: '#1E293B', background: '#0F172A' };
    const fonts = bd.recommendedFonts || ['Montserrat', 'Inter'];

    const title = copy.title || 'BỨT PHÁ HIỆU NĂNG';
    const subtitle = copy.subtitle || 'Dòng sản phẩm cao cấp - Bảo vệ tối ưu trên mọi hành trình';
    const badge = copy.badge || copy.eyebrow || 'HÀNG MỚI VỀ SHOP';
    const cta = copy.cta || 'MUA NGAY TẠI SHOP';
    const features = options.features || '⚡ Bôi trơn siêu cấp  |  🔥 Tản nhiệt cực nhanh  |  🛡️ Bảo vệ động cơ 24/7';

    const isAlignLeft = safeZone.align === 'left';
    const textX = isAlignLeft ? safeZone.xMin : 50;
    const textAlign = isAlignLeft ? 'left' : 'center';

    const layers = [
      // 1. Optional Gradient Masking to guarantee text legibility
      {
        id: 'gradient_mask_top',
        type: 'shape',
        shape: 'rect',
        x: 50,
        y: 20,
        width: 100,
        height: 40,
        fill: '#000000',
        opacity: 0.35
      },
      // 2. Main Product Subject
      {
        id: 'main_subject',
        type: 'image',
        url: productImageUrl || null,
        x: 50,
        y: 54,
        width: 65,
        height: 48,
        fit: 'contain',
        removeBackground: true,
        adjustments: {
          brightness: 6,
          contrast: 15,
          saturation: 10
        }
      },
      // 3. Badge
      {
        id: 'badge_bg',
        type: 'shape',
        shape: 'roundedRect',
        x: textX,
        y: safeZone.yMin + 2,
        width: 30,
        height: 4.6,
        fill: colors.accent,
        cornerRadius: 6
      },
      {
        id: 'badge_text',
        type: 'text',
        text: badge.toUpperCase(),
        x: textX,
        y: safeZone.yMin + 2,
        width: 30,
        height: 4.6,
        fontFamily: fonts[0],
        fontWeight: 800,
        fontSize: 16,
        color: colors.background || '#020617',
        align: 'center'
      },
      // 4. Headline (Tier 1 visual hierarchy)
      {
        id: 'headline',
        type: 'text',
        text: title.toUpperCase(),
        x: textX,
        y: safeZone.yMin + 10,
        width: isAlignLeft ? (safeZone.xMax - safeZone.xMin) : 88,
        height: 14,
        fontFamily: fonts[0],
        fontWeight: 900,
        fontSize: 54,
        color: colors.text,
        align: textAlign
      },
      // 5. Subtitle (Tier 2 visual hierarchy)
      {
        id: 'subtitle',
        type: 'text',
        text: subtitle,
        x: textX,
        y: safeZone.yMin + 21,
        width: isAlignLeft ? (safeZone.xMax - safeZone.xMin) : 84,
        height: 7,
        fontFamily: fonts[1],
        fontWeight: 600,
        fontSize: 20,
        color: colors.accent,
        align: textAlign
      },
      // 6. Feature bullet points (Tier 3)
      {
        id: 'features',
        type: 'text',
        text: features,
        x: 50,
        y: (safeZone.ctaY || 90) - 8,
        width: 88,
        height: 5,
        fontFamily: fonts[1],
        fontWeight: 500,
        fontSize: 16,
        color: '#E2E8F0',
        align: 'center'
      },
      // 7. Call To Action Button
      {
        id: 'cta_bg',
        type: 'shape',
        shape: 'roundedRect',
        x: 50,
        y: safeZone.ctaY || 90,
        width: 38,
        height: 6,
        fill: colors.accent,
        cornerRadius: 30
      },
      {
        id: 'cta_label',
        type: 'text',
        text: cta.toUpperCase(),
        x: 50,
        y: safeZone.ctaY || 90,
        width: 38,
        height: 6,
        fontFamily: fonts[0],
        fontWeight: 800,
        fontSize: 18,
        color: colors.background || '#020617',
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
      preset: bd.aspectRatio || '9:16',
      title,
      subtitle,
      badge,
      canvas: {
        width: bd.aspectRatio === '4:5' ? 1080 : 1080,
        height: bd.aspectRatio === '4:5' ? 1350 : 1920,
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
        productCaption: `🔥 ${title}!\n\n✨ ${subtitle}\n\n📍 ${features}\n\n👉 Ghé ngay cửa hàng để nhận ưu đãi hấp dẫn!`,
        hashtags: ['#Daunhotchinhhang', '#Phutungxe', '#ChamSocXe', '#AikarikStudio', `#${bd.category.toUpperCase()}`]
      }
    };
  }
}

module.exports = new ObsidianPosterService();
