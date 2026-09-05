/**
 * Social Automated Direct Publishing Module (Facebook Graph API & TikTok Content Posting API)
 * Powered by Gemini 3.1 Flash Lite.
 * Fully automated: Publishes directly to platforms without needing manual copy-pasting (Ctrl + V).
 */

(function () {
    let currentPlatform = 'facebook';
    let activeMediaData = {
        url: '',
        mediaType: 'image',
        caption: '',
        hashtags: []
    };

    /**
     * Helper to get Authentication Headers from LocalStorage
     */
    function getAuthHeaders() {
        const token = localStorage.getItem('auth_token') || '';
        let userInfo = {};
        try {
            userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        } catch (e) {}

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (userInfo.id) headers['x-user-id'] = userInfo.id;
        if (userInfo.email) headers['x-user-email'] = userInfo.email;
        if (userInfo.role !== undefined) headers['x-user-role'] = String(userInfo.role);

        return headers;
    }

    /**
     * Khởi tạo và liên kết các sự kiện cho Modal
     */
    function initSocialPublishModule() {
        const modal = document.getElementById('socialPublishModal');
        const btnClose = document.getElementById('btnCloseSocialModal');
        const btnCancel = document.getElementById('btnCancelSocialModal');
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');

        if (!modal) return;

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        if (captionInput) {
            captionInput.addEventListener('input', () => {
                updateLivePreview();
            });
        }
        if (hashtagsInput) {
            hashtagsInput.addEventListener('input', () => {
                updateLivePreview();
            });
        }
    }

    /**
     * Chuyển đổi giữa chế độ Soạn Thảo (Editor) và Xem Trước Bảng Tin (Live Preview)
     */
    function toggleViewMode(mode = 'editor') {
        const tabEditor = document.getElementById('tabViewEditor');
        const tabPreview = document.getElementById('tabViewPreview');
        const editorContainer = document.getElementById('socialEditorContainer');
        const fbPreviewCard = document.getElementById('fbLivePreviewCard');
        const ttPreviewCard = document.getElementById('ttLivePreviewCard');

        if (mode === 'preview') {
            updateLivePreview();
            if (editorContainer) editorContainer.classList.add('hidden');

            if (currentPlatform === 'tiktok') {
                if (fbPreviewCard) fbPreviewCard.classList.add('hidden');
                if (ttPreviewCard) ttPreviewCard.classList.remove('hidden');
            } else {
                if (ttPreviewCard) ttPreviewCard.classList.add('hidden');
                if (fbPreviewCard) fbPreviewCard.classList.remove('hidden');
            }

            if (tabEditor) {
                tabEditor.className = 'px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all flex items-center gap-1.5 cursor-pointer';
            }
            if (tabPreview) {
                const activeGrad = currentPlatform === 'tiktok' ? 'bg-gradient-to-r from-pink-600 to-rose-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600';
                tabPreview.className = `px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeGrad} text-white shadow-sm flex items-center gap-1.5 cursor-pointer`;
            }
        } else {
            if (fbPreviewCard) fbPreviewCard.classList.add('hidden');
            if (ttPreviewCard) ttPreviewCard.classList.add('hidden');
            if (editorContainer) editorContainer.classList.remove('hidden');

            if (tabEditor) {
                const activeGrad = currentPlatform === 'tiktok' ? 'bg-gradient-to-r from-pink-600 to-rose-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600';
                tabEditor.className = `px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeGrad} text-white shadow-sm flex items-center gap-1.5 cursor-pointer`;
            }
            if (tabPreview) {
                tabPreview.className = 'px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all flex items-center gap-1.5 cursor-pointer';
            }
        }
    }

    /**
     * Cập nhật bản xem trước Bảng tin (Facebook / TikTok) và bộ đếm ký tự trong thời gian thực
     */
    function updateLivePreview() {
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const charCounter = document.getElementById('captionCharCounter');
        
        // FB elements
        const fbPreviewTextDiv = document.getElementById('fbPreviewPostText');
        const fbPreviewImg = document.getElementById('fbPreviewMediaImg');

        // TT elements
        const ttPreviewTextDiv = document.getElementById('ttPreviewPostText');
        const ttPreviewImg = document.getElementById('ttPreviewMediaImg');
        const ttPlaceholder = document.getElementById('ttPreviewMediaPlaceholder');

        const caption = captionInput ? captionInput.value : '';
        const hashtags = hashtagsInput ? hashtagsInput.value : '';

        if (charCounter) {
            charCounter.textContent = `${caption.length} ký tự`;
        }

        const fullText = getFullPostText();
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const targetUrl = (mediaUrlInput ? mediaUrlInput.value.trim() : '') || activeMediaData.url;

        // 1. Cập nhật Facebook Live Preview
        if (fbPreviewTextDiv) {
            if (!fullText) {
                fbPreviewTextDiv.innerHTML = '<span class="text-slate-500 italic">Chưa có nội dung bài đăng. Nhập bài viết ở tab Soạn Thảo hoặc yêu cầu AI tạo...</span>';
            } else {
                let safeText = fullText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                safeText = safeText.replace(/(#[a-zA-Z0-9_\u00C0-\u1EF9]+)/g, '<span class="text-[#4599ff] font-medium hover:underline cursor-pointer">$1</span>');
                fbPreviewTextDiv.innerHTML = safeText;
            }
        }

        if (fbPreviewImg) {
            if (targetUrl && (targetUrl.startsWith('data:') || targetUrl.startsWith('http') || targetUrl.startsWith('/uploads'))) {
                fbPreviewImg.src = targetUrl;
                fbPreviewImg.classList.remove('hidden');
            } else {
                fbPreviewImg.classList.add('hidden');
            }
        }

        // 2. Cập nhật TikTok Live Preview
        if (ttPreviewTextDiv) {
            if (!fullText) {
                ttPreviewTextDiv.innerHTML = '<span class="text-slate-500 italic">Chưa có nội dung mô tả TikTok...</span>';
            } else {
                let safeText = fullText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                safeText = safeText.replace(/(#[a-zA-Z0-9_\u00C0-\u1EF9]+)/g, '<span class="text-[#fe2c55] dark:text-[#25f4ee] font-bold hover:underline cursor-pointer">$1</span>');
                ttPreviewTextDiv.innerHTML = safeText;
            }
        }

        if (ttPreviewImg) {
            if (targetUrl && (targetUrl.startsWith('data:') || targetUrl.startsWith('http') || targetUrl.startsWith('/uploads'))) {
                ttPreviewImg.src = targetUrl;
                ttPreviewImg.classList.remove('hidden');
                if (ttPlaceholder) ttPlaceholder.classList.add('hidden');
            } else {
                ttPreviewImg.classList.add('hidden');
                if (ttPlaceholder) ttPlaceholder.classList.remove('hidden');
            }
        }
    }

    /**
     * 🪄 Chuẩn Hóa Canh Lề & Xuống Dòng Bài Đăng Chuẩn Facebook & TikTok 1-Click
     */
    function autoFormatFacebookText() {
        const captionInput = document.getElementById('socialCaptionInput');
        if (!captionInput) return;

        let text = captionInput.value;
        if (!text || !text.trim()) {
            showStatusAlert('⚠️ Chưa có nội dung bài đăng để căn lề. Hãy nhập nội dung trước!', 'error');
            return;
        }

        // 1. Chuẩn hóa ký tự ngắt dòng
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // 2. Tách từng dòng và làm sạch khoảng trắng thừa ở hai đầu dòng
        const rawLines = text.split('\n');
        const cleanedLines = [];

        const bulletIcons = ['🔹', '👉', '✅', '✨', '⭐', '✔', '▪', '•', '🔸', '📍', '📌', '💡', '💎', '🔥', '⚡'];
        const sectionStarters = ['🔥', '💥', '⚡', '🎁', '🚚', '🛡️', '👉', '☎️', '📞', '🌐', '🏠', '🎯', '💯'];

        for (let i = 0; i < rawLines.length; i++) {
            let line = rawLines[i].trim();

            for (const icon of bulletIcons) {
                if (line.startsWith(icon) && !line.startsWith(icon + ' ')) {
                    line = icon + ' ' + line.substring(icon.length).trim();
                    break;
                }
            }

            cleanedLines.push(line);
        }

        // 3. Tái cấu trúc khoảng thở
        const formatted = [];
        let inBulletList = false;

        for (let i = 0; i < cleanedLines.length; i++) {
            const cur = cleanedLines[i];
            const isBullet = bulletIcons.some(ic => cur.startsWith(ic));
            const isSection = sectionStarters.some(st => cur.startsWith(st));

            if (cur === '') {
                if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                    formatted.push('');
                }
                inBulletList = false;
                continue;
            }

            if (isSection && !isBullet && formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                formatted.push('');
            }

            if (inBulletList && !isBullet && formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                formatted.push('');
            }

            formatted.push(cur);
            inBulletList = isBullet;
        }

        let resultText = formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();

        captionInput.value = resultText;
        updateLivePreview();
        
        const platformName = currentPlatform === 'tiktok' ? 'TikTok' : 'Facebook';
        showStatusAlert(`✨ Đã tự động chuẩn hóa canh lề & ngắt dòng đẹp mắt chuẩn phong cách ${platformName}!`, 'success');
    }

    /**
     * Mở Modal xuất bản với dữ liệu bài viết (Ảnh / Poster / Video)
     */
    async function openModal(mediaInfo = {}) {
        let modal = document.getElementById('socialPublishModal');
        if (!modal) {
            let container = document.getElementById('socialPublishModalContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'socialPublishModalContainer';
                document.body.appendChild(container);
            }
            try {
                const res = await fetch('/components/socialPublishModal.html');
                if (res.ok) {
                    container.innerHTML = await res.text();
                    initSocialPublishModule();
                    modal = document.getElementById('socialPublishModal');
                }
            } catch (err) {
                console.error('[SocialPublish] Dynamic load modal error:', err);
            }
        }

        if (!modal) {
            console.error('[SocialPublish] Could not find or load #socialPublishModal');
            return;
        }

        // Ưu tiên lấy ảnh mới nhất từ Studio hoặc ảnh upload gần nhất
        const resolvedUrl = mediaInfo.url || mediaInfo.imageData || window.lastStudioEditedImage || window.lastUploadedImageUrl || '';

        // Lưu thông tin media
        activeMediaData = {
            url: resolvedUrl,
            mediaType: mediaInfo.mediaType || (resolvedUrl && resolvedUrl.endsWith('.mp4') ? 'video' : 'image'),
            caption: mediaInfo.caption || '',
            hashtags: mediaInfo.hashtags || ['#aikarik', '#sanpham', '#viral', '#facebook']
        };

        // Điền vào form
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const mediaPreviewBox = document.getElementById('socialMediaPreviewBox');
        const mediaBadge = document.getElementById('socialMediaBadge');

        if (captionInput) captionInput.value = activeMediaData.caption;
        if (hashtagsInput) {
            hashtagsInput.value = Array.isArray(activeMediaData.hashtags) 
                ? activeMediaData.hashtags.join(' ') 
                : (activeMediaData.hashtags || '');
        }
        if (mediaUrlInput) mediaUrlInput.value = activeMediaData.url;

        // Render preview media
        if (mediaPreviewBox) {
            if (activeMediaData.url) {
                if (activeMediaData.mediaType === 'video' || activeMediaData.url.endsWith('.mp4')) {
                    mediaPreviewBox.innerHTML = `<video src="${activeMediaData.url}" class="w-full h-full object-cover rounded-lg"></video>`;
                    if (mediaBadge) mediaBadge.textContent = 'Video Sản Phẩm';
                } else {
                    mediaPreviewBox.innerHTML = `<img src="${activeMediaData.url}" alt="Preview" class="w-full h-full object-contain rounded-lg" />`;
                    if (mediaBadge) mediaBadge.textContent = 'Ảnh Sản Phẩm (Studio)';
                }
            } else {
                mediaPreviewBox.innerHTML = `<span class="material-symbols-outlined text-3xl text-slate-500">image</span>`;
            }
        }

        // Ẩn thông báo cũ
        hideStatusAlert();

        // Chuyển về nền tảng mong muốn hoặc mặc định Facebook
        try {
            switchPlatform(mediaInfo.platform || currentPlatform || 'facebook');
        } catch (err) {
            console.warn('[SocialPublish] switchPlatform error (non-fatal):', err);
        }

        // Khởi tạo xem trước và chế độ xem
        try {
            toggleViewMode('editor');
            updateLivePreview();
        } catch (err) {
            console.warn('[SocialPublish] toggleViewMode/updateLivePreview error (non-fatal):', err);
        }

        // Hiện modal - đảm bảo display được set đúng (override cả inline style lẫn Tailwind hidden)
        modal.removeAttribute('style');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
    }

    /**
     * Tải lại ảnh mới nhất từ AI Karik Studio vào Modal
     */
    function reloadStudioImage() {
        const latestImg = window.lastStudioEditedImage || window.lastUploadedImageUrl || '';
        if (!latestImg) {
            showStatusAlert('⚠️ Chưa có ảnh mới trong AI Karik Studio. Hãy vào Studio để chỉnh sửa hoặc tạo ảnh trước!', 'error');
            return;
        }

        activeMediaData.url = latestImg;
        activeMediaData.mediaType = 'image';

        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const mediaPreviewBox = document.getElementById('socialMediaPreviewBox');
        const mediaBadge = document.getElementById('socialMediaBadge');

        if (mediaUrlInput) mediaUrlInput.value = latestImg;
        if (mediaPreviewBox) {
            mediaPreviewBox.innerHTML = `<img src="${latestImg}" alt="Studio Preview" class="w-full h-full object-contain rounded-lg" />`;
        }
        if (mediaBadge) mediaBadge.textContent = 'Ảnh Sản Phẩm (Studio)';

        showStatusAlert('✅ Đã cập nhật bức ảnh mới nhất từ AI Karik Studio vào bài đăng!', 'success');
        updateLivePreview();
    }

    function closeModal() {
        const modal = document.getElementById('socialPublishModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            modal.style.display = 'none';
        }
    }

    /**
     * Chuyển đổi giữa 2 nền tảng Facebook và TikTok
     */
    function switchPlatform(platform) {
        currentPlatform = platform;

        const modal = document.getElementById('socialPublishModal');
        const tabBtnFb = document.getElementById('tabBtnFacebook');
        const tabBtnTt = document.getElementById('tabBtnTiktok');
        const targetName = document.getElementById('targetPlatformName');
        const submitBtnText = document.getElementById('btnAutoPublishText');
        const tabPreviewText = document.getElementById('tabViewPreviewText');
        const autoFormatText = document.getElementById('btnAutoFormatText');
        const autoFormatBtn = document.getElementById('btnAutoFormatFB');
        const botBtn = document.getElementById('btnBrowserBotFB');
        const botBtnText = document.getElementById('btnBrowserBotText');
        const editorContainer = document.getElementById('socialEditorContainer');
        const isPreviewOpen = editorContainer && editorContainer.classList.contains('hidden');

        if (modal) {
            if (platform === 'tiktok') {
                modal.classList.add('platform-tiktok');
                modal.classList.remove('platform-facebook');
            } else {
                modal.classList.add('platform-facebook');
                modal.classList.remove('platform-tiktok');
            }
        }

        if (platform === 'facebook') {
            if (tabBtnFb) {
                tabBtnFb.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-blue-500/50 bg-blue-50 dark:bg-blue-600/25 text-blue-900 dark:text-white font-bold transition-all shadow-sm hover:bg-blue-100 dark:hover:bg-blue-600/35 cursor-pointer';
            }
            if (tabBtnTt) {
                tabBtnTt.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-400 font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white cursor-pointer';
            }
            if (targetName) targetName.textContent = 'Facebook';
            if (submitBtnText) submitBtnText.textContent = '⚡ Tự Động Đăng Lên Facebook';
            if (botBtnText) botBtnText.textContent = '🤖 Đồng Ý & Cho AI Vào Facebook Đăng Bài';
            if (tabPreviewText) tabPreviewText.textContent = 'Xem Trước Bảng Tin FB';
            if (autoFormatText) autoFormatText.textContent = '🪄 Chuẩn Hóa Canh Lề FB';
            if (autoFormatBtn) autoFormatBtn.title = 'Tự động căn lề, ngắt dòng đôi và chuẩn hóa cấu trúc bài đăng Facebook';
            if (botBtn) {
                botBtn.className = 'w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold border border-blue-400/50 px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer';
            }
        } else {
            if (tabBtnTt) {
                tabBtnTt.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-pink-500/50 bg-pink-50 dark:bg-pink-600/25 text-pink-900 dark:text-white font-bold transition-all shadow-sm hover:bg-pink-100 dark:hover:bg-pink-600/35 cursor-pointer';
            }
            if (tabBtnFb) {
                tabBtnFb.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100/80 dark:bg-slate-800/40 text-slate-700 dark:text-slate-400 font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white cursor-pointer';
            }
            if (targetName) targetName.textContent = 'TikTok';
            if (submitBtnText) submitBtnText.textContent = '⚡ Tự Động Đăng Lên TikTok';
            if (botBtnText) botBtnText.textContent = '🤖 Đồng Ý & Cho AI Vào TikTok Studio Đăng Bài';
            if (tabPreviewText) tabPreviewText.textContent = 'Xem Trước Feed TikTok';
            if (autoFormatText) autoFormatText.textContent = '🪄 Chuẩn Hóa Caption TikTok';
            if (autoFormatBtn) autoFormatBtn.title = 'Tự động ngắt dòng, căn chỉnh độ dài và tối ưu hóa hashtag chuẩn TikTok';
            if (botBtn) {
                botBtn.className = 'w-full sm:w-auto bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold border border-pink-400/50 px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer';
            }
        }

        if (isPreviewOpen) {
            toggleViewMode('preview');
        } else {
            updateLivePreview();
        }
    }

    /**
     * Lấy toàn bộ nội dung Caption + Hashtags đã ghép
     */
    function getFullPostText() {
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');

        const caption = captionInput ? captionInput.value.trim() : '';
        const hashtags = hashtagsInput ? hashtagsInput.value.trim() : '';

        let fullText = caption;
        if (hashtags) {
            fullText += (fullText ? '\n\n' : '') + hashtags;
        }
        return fullText;
    }

    /**
     * Tự động sao chép Caption + Hashtags vào Clipboard
     */
    async function copyCaptionToClipboard(showToast = true) {
        const fullText = getFullPostText();
        const copyBtnText = document.getElementById('copyCaptionBtnText');

        if (!fullText) {
            if (showToast) showStatusAlert('⚠️ Chưa có nội dung Caption để sao chép.', 'error');
            return false;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fullText);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = fullText;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }

            if (copyBtnText) {
                const oldText = copyBtnText.textContent;
                copyBtnText.textContent = '✅ Đã Copy!';
                setTimeout(() => {
                    copyBtnText.textContent = oldText;
                }, 2500);
            }

            if (showToast) {
                showStatusAlert('📋 Đã sao chép toàn bộ Caption & Hashtags vào bộ nhớ tạm!', 'success');
            }
            return true;
        } catch (err) {
            console.warn('[SocialPublish] Copy error:', err);
            if (showToast) showStatusAlert('⚠️ Không thể tự động sao chép: ' + err.message, 'error');
            return false;
        }
    }

    /**
     * Tải hình ảnh / poster / video về máy tính
     */
    function downloadCurrentMedia(silent = false) {
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const mediaUrl = (mediaUrlInput ? mediaUrlInput.value.trim() : '') || activeMediaData.url;

        if (!mediaUrl) {
            if (!silent) showStatusAlert('⚠️ Không tìm thấy file hình ảnh hoặc video để tải.', 'error');
            return;
        }

        try {
            const isVideo = mediaUrl.endsWith('.mp4') || activeMediaData.mediaType === 'video';
            const ext = isVideo ? 'mp4' : (mediaUrl.startsWith('data:image/svg') ? 'svg' : (mediaUrl.startsWith('data:image/png') ? 'png' : 'jpg'));
            const filename = `aikarik-publish-${Date.now()}.${ext}`;

            const a = document.createElement('a');
            a.href = mediaUrl;
            a.download = filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            if (!silent) {
                showStatusAlert(`💾 Đã tải file "${filename}" về máy tính!`, 'success');
            }
        } catch (err) {
            console.warn('[SocialPublish] Download error:', err);
            if (!silent) showStatusAlert('⚠️ Không thể tải file: ' + err.message, 'error');
        }
    }

    /**
     * Helper phân tích JSON an toàn, tránh lỗi Unexpected token '<' khi server trả về HTML 404/500
     */
    async function parseJsonResponse(res) {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            if (res.status === 404) {
                throw new Error('Chưa tìm thấy endpoint trên Server (404 Not Found). Vui lòng khởi động lại server Node.js (npm start / npm run dev) để nạp route mới nhất!');
            }
            if (!res.ok) {
                throw new Error(`Máy chủ trả về mã lỗi ${res.status}: ${text.slice(0, 150) || res.statusText}`);
            }
            throw new Error(`Dữ liệu máy chủ trả về không đúng định dạng JSON: ${text.slice(0, 100)}`);
        }
    }

    /**
     * ⚡ CỐT LÕI: TỰ ĐỘNG XUẤT BẢN TRỰC TIẾP QUA API (Không cần mở trình duyệt dán thủ công)
     */
    async function autoPublishDirect() {
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const submitBtn = document.getElementById('btnAutoPublishDirect');

        const caption = captionInput ? captionInput.value.trim() : '';
        const rawTags = hashtagsInput ? hashtagsInput.value.trim() : '';
        const mediaUrl = mediaUrlInput ? mediaUrlInput.value.trim() : activeMediaData.url;
        const hashtags = rawTags.split(/[\s,]+/).filter(t => t.length > 0);

        if (!caption && !mediaUrl) {
            showStatusAlert('⚠️ Vui lòng nhập nội dung bài viết hoặc đính kèm hình ảnh/video.', 'error');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        showStatusAlert(`⚡ Đang tự động xuất bản bài viết lên ${currentPlatform.toUpperCase()} qua API...`, 'info');

        try {
            const payload = {
                platform: currentPlatform,
                caption,
                hashtags,
                mediaUrls: mediaUrl ? [mediaUrl] : [],
                mediaType: activeMediaData.mediaType || (mediaUrl?.endsWith('.mp4') ? 'video' : 'image')
            };

            const res = await fetch('/api/social/direct-publish', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const result = await parseJsonResponse(res);

            if (result.success && result.data) {
                const postUrl = result.data.postUrl || (currentPlatform === 'facebook' ? 'https://www.facebook.com/' : 'https://www.tiktok.com/tiktokstudio');
                const postId = result.data.postId || result.data.publishId || 'SUCCESS';

                showStatusAlert(
                    `🎉 **Tự Động Xuất Bản Thành Công Lên ${currentPlatform.toUpperCase()}!**\n` +
                    `📌 Mã bài viết: \`${postId}\`\n` +
                    `🌐 [👉 Bấm vào đây để xem bài viết trên ${currentPlatform.toUpperCase()}](${postUrl})`,
                    'success'
                );
            } else {
                showStatusAlert(`⚠️ Xuất bản thất bại: ${result.message || 'Lỗi không xác định'}`, 'error');
            }
        } catch (err) {
            console.error('[SocialPublish] Direct Publish Error:', err);
            showStatusAlert(`⚠️ Lỗi kết nối API: ${err.message}`, 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    /**
     * 🤖 BROWSER BOT: Tự động khởi chạy Chrome/Edge vào Facebook để đăng bài thực tế
     */
    async function runBrowserBotFacebook() {
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const submitBtn = document.getElementById('btnBrowserBotFB');

        const caption = captionInput ? captionInput.value.trim() : '';
        const rawTags = hashtagsInput ? hashtagsInput.value.trim() : '';
        const mediaUrl = (mediaUrlInput ? mediaUrlInput.value.trim() : '') || activeMediaData.url || window.lastStudioEditedImage || window.lastUploadedImageUrl || '';
        const hashtags = rawTags.split(/[\s,]+/).filter(t => t.length > 0);

        if (!caption && !mediaUrl) {
            showStatusAlert('⚠️ Vui lòng nhập nội dung bài viết hoặc đính kèm hình ảnh/video.', 'error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-70');
        }
        showStatusAlert('🤖 **Đang khởi chạy Browser Bot...**\nĐang mở trình duyệt Chrome/Edge và truy cập Facebook để tự động tải ảnh sản phẩm từ Studio & đăng bài...', 'info');

        try {
            const payload = {
                caption,
                hashtags,
                mediaUrls: mediaUrl ? [mediaUrl] : [],
                mediaType: activeMediaData.mediaType || (mediaUrl?.endsWith('.mp4') ? 'video' : 'image'),
                autoClickPost: true
            };

            const res = await fetch('/api/social/browser-bot/facebook', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const result = await parseJsonResponse(res);

            if (result.success) {
                const logsFormatted = (result.data?.logs || []).join('\n');
                showStatusAlert(
                    `🎉 **Browser Bot Đã Đăng Bài Lên Facebook Thành Công!**\n` +
                    (logsFormatted ? `\n\`\`\`\n${logsFormatted}\n\`\`\`` : ''),
                    'success'
                );
            } else {
                if (result.data?.requiresLogin) {
                    showStatusAlert(
                        `⚠️ **Yêu Cầu Đăng Nhập Facebook Trên Trình Duyệt**\n` +
                        `Bot đã mở sẵn cửa sổ trình duyệt Facebook. Bạn chỉ cần đăng nhập tài khoản một lần để lưu phiên làm việc, sau đó nhấn lại nút Bot!`,
                        'error'
                    );
                } else {
                    showStatusAlert(`⚠️ Bot báo lỗi: ${result.message || 'Không thể thực thi'}`, 'error');
                }
            }
        } catch (err) {
            console.error('[SocialPublish] Browser Bot Error:', err);
            showStatusAlert(`⚠️ Lỗi khởi chạy Bot: ${err.message}`, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-70');
            }
        }
    }

    /**
     * 🤖 BROWSER BOT: Tự động khởi chạy Chrome/Edge vào TikTok Creator Studio để đăng bài thực tế
     */
    async function runBrowserBotTiktok() {
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const submitBtn = document.getElementById('btnBrowserBotFB');

        const caption = captionInput ? captionInput.value.trim() : '';
        const rawTags = hashtagsInput ? hashtagsInput.value.trim() : '';
        const mediaUrl = (mediaUrlInput ? mediaUrlInput.value.trim() : '') || activeMediaData.url || window.lastStudioEditedImage || window.lastUploadedImageUrl || '';
        const hashtags = rawTags.split(/[\s,]+/).filter(t => t.length > 0);

        if (!mediaUrl) {
            showStatusAlert(
                '⚠️ **TikTok Creator Studio bắt buộc phải có Ảnh hoặc Video để tạo bài đăng.**\n\n' +
                '👉 Bạn hãy bấm nút **"🔄 Cập nhật ảnh Studio"** ở phía trên (nếu đã tạo ảnh trong Karik Studio), hoặc dán đường dẫn file ảnh/video vào ô **"Hình Ảnh Sản Phẩm"** trước khi cho AI mở trình duyệt!',
                'error'
            );
            if (mediaUrlInput) {
                mediaUrlInput.focus();
                mediaUrlInput.classList.add('border-pink-500');
                setTimeout(() => mediaUrlInput.classList.remove('border-pink-500'), 3000);
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-70');
        }
        showStatusAlert('🤖 **Đang khởi chạy TikTok Browser Bot...**\nĐang mở trình duyệt Chrome/Edge và truy cập TikTok Creator Studio để tự động nạp ảnh/video từ Studio, chuyển tab Photos và xuất bản bài đăng...', 'info');

        try {
            const payload = {
                caption,
                hashtags,
                mediaUrls: mediaUrl ? [mediaUrl] : [],
                mediaType: activeMediaData.mediaType || (mediaUrl?.endsWith('.mp4') ? 'video' : 'image'),
                autoClickPost: true
            };

            const res = await fetch('/api/social/browser-bot/tiktok', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const result = await parseJsonResponse(res);

            if (result.success) {
                const logsFormatted = (result.data?.logs || []).join('\n');
                showStatusAlert(
                    `🎉 **Browser Bot Đã Đăng Bài Lên TikTok Creator Studio Thành Công!**\n` +
                    (logsFormatted ? `\n\`\`\`\n${logsFormatted}\n\`\`\`` : ''),
                    'success'
                );
            } else {
                if (result.data?.requiresLogin) {
                    showStatusAlert(
                        `⚠️ **Yêu Cầu Đăng Nhập TikTok Trên Trình Duyệt**\n` +
                        `Bot đã mở sẵn cửa sổ trình duyệt TikTok Creator Studio. Bạn chỉ cần đăng nhập tài khoản một lần để lưu phiên làm việc, sau đó nhấn lại nút Bot!`,
                        'error'
                    );
                } else {
                    showStatusAlert(`⚠️ Bot báo lỗi: ${result.message || 'Không thể thực thi'}`, 'error');
                }
            }
        } catch (err) {
            console.error('[SocialPublish] TikTok Browser Bot Error:', err);
            showStatusAlert(`⚠️ Lỗi khởi chạy Bot: ${err.message}`, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-70');
            }
        }
    }

    /**
     * Kích hoạt Browser Bot tương ứng với nền tảng đang chọn (Facebook hoặc TikTok)
     */
    function triggerActiveBrowserBot() {
        if (currentPlatform === 'tiktok') {
            return runBrowserBotTiktok();
        }
        return runBrowserBotFacebook();
    }

    /**
     * Mở đường dẫn trình duyệt (Facebook hoặc TikTok Studio) nếu người dùng muốn
     */
    function openBrowserDirectLink() {
        const targetUrl = currentPlatform === 'tiktok' 
            ? 'https://www.tiktok.com/tiktokstudio/upload' 
            : 'https://www.facebook.com/';
        
        copyCaptionToClipboard(false);
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        showStatusAlert(`🚀 Đã mở ${currentPlatform.toUpperCase()} trên trình duyệt!`, 'success');
    }

    function showStatusAlert(msg, type = 'info') {
        const alertBox = document.getElementById('socialStatusAlert');
        if (!alertBox) return;

        alertBox.classList.remove('hidden', 'bg-blue-900/50', 'border-blue-500/50', 'text-blue-200',
            'bg-emerald-900/50', 'border-emerald-500/50', 'text-emerald-200',
            'bg-red-900/50', 'border-red-500/50', 'text-red-200');

        let icon = 'info';
        if (type === 'success') {
            alertBox.className = 'p-3 rounded-xl text-xs flex items-start gap-2 border bg-emerald-900/60 border-emerald-500/50 text-emerald-200 animate-fadeIn';
            icon = 'check_circle';
        } else if (type === 'error') {
            alertBox.className = 'p-3 rounded-xl text-xs flex items-start gap-2 border bg-red-900/60 border-red-500/50 text-red-200 animate-fadeIn';
            icon = 'error';
        } else {
            alertBox.className = 'p-3 rounded-xl text-xs flex items-start gap-2 border bg-blue-900/60 border-blue-500/50 text-blue-200 animate-fadeIn';
            icon = 'hourglass_top';
        }

        // Format markdown bold & markdown link & code block
        let formattedMsg = (msg || '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/60 p-2 rounded text-[10px] text-slate-300 font-mono overflow-x-auto my-1">$1</pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">$1</code>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" class="underline text-cyan-300 hover:text-white font-bold inline-flex items-center gap-0.5">$1 <span class="material-symbols-outlined text-xs">open_in_new</span></a>')
            .replace(/\n/g, '<br>');

        alertBox.innerHTML = `<span class="material-symbols-outlined text-base flex-shrink-0 mt-0.5">${icon}</span> <div class="leading-relaxed flex-1">${formattedMsg}</div>`;
    }

    function hideStatusAlert() {
        const alertBox = document.getElementById('socialStatusAlert');
        if (alertBox) alertBox.classList.add('hidden');
    }

    // Expose to global window object
    window.socialPublish = {
        init: initSocialPublishModule,
        openModal,
        closeModal,
        reloadStudioImage,
        switchPlatform,
        copyCaptionToClipboard,
        downloadCurrentMedia,
        autoPublishDirect,
        runBrowserBotFacebook,
        runBrowserBotTiktok,
        triggerActiveBrowserBot,
        openBrowserDirectLink,
        toggleViewMode,
        autoFormatFacebookText,
        updateLivePreview
    };
})();
