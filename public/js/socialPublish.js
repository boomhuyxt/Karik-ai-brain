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
     * Chuyển đổi giữa chế độ Soạn Thảo (Editor) và Xem Trước Bảng Tin FB (Live Preview)
     */
    function toggleViewMode(mode = 'editor') {
        const tabEditor = document.getElementById('tabViewEditor');
        const tabPreview = document.getElementById('tabViewPreview');
        const editorContainer = document.getElementById('socialEditorContainer');
        const previewCard = document.getElementById('fbLivePreviewCard');

        if (mode === 'preview') {
            updateLivePreview();
            if (editorContainer) editorContainer.classList.add('hidden');
            if (previewCard) previewCard.classList.remove('hidden');

            if (tabEditor) {
                tabEditor.className = 'px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer';
            }
            if (tabPreview) {
                tabPreview.className = 'px-3 py-1 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
            }
        } else {
            if (previewCard) previewCard.classList.add('hidden');
            if (editorContainer) editorContainer.classList.remove('hidden');

            if (tabEditor) {
                tabEditor.className = 'px-3 py-1 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm flex items-center gap-1.5 cursor-pointer';
            }
            if (tabPreview) {
                tabPreview.className = 'px-3 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer';
            }
        }
    }

    /**
     * Cập nhật bản xem trước Bảng tin Facebook và bộ đếm ký tự trong thời gian thực
     */
    function updateLivePreview() {
        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const charCounter = document.getElementById('captionCharCounter');
        const previewTextDiv = document.getElementById('fbPreviewPostText');
        const previewImg = document.getElementById('fbPreviewMediaImg');

        const caption = captionInput ? captionInput.value : '';
        const hashtags = hashtagsInput ? hashtagsInput.value : '';

        if (charCounter) {
            charCounter.textContent = `${caption.length} ký tự`;
        }

        if (previewTextDiv) {
            let fullText = getFullPostText();
            if (!fullText) {
                previewTextDiv.innerHTML = '<span class="text-slate-500 italic">Chưa có nội dung bài đăng. Nhập bài viết ở tab Soạn Thảo hoặc yêu cầu AI tạo...</span>';
            } else {
                // Escape HTML
                let safeText = fullText
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                // Highlight hashtags with Facebook blue
                safeText = safeText.replace(/(#[a-zA-Z0-9_\u00C0-\u1EF9]+)/g, '<span class="text-[#4599ff] font-medium hover:underline cursor-pointer">$1</span>');

                previewTextDiv.innerHTML = safeText;
            }
        }

        if (previewImg) {
            const mediaUrlInput = document.getElementById('socialMediaUrlInput');
            const targetUrl = (mediaUrlInput ? mediaUrlInput.value.trim() : '') || activeMediaData.url;
            if (targetUrl && (targetUrl.startsWith('data:') || targetUrl.startsWith('http') || targetUrl.startsWith('/uploads'))) {
                previewImg.src = targetUrl;
                previewImg.classList.remove('hidden');
            } else {
                previewImg.classList.add('hidden');
            }
        }
    }

    /**
     * 🪄 Chuẩn Hóa Canh Lề & Xuống Dòng Bài Đăng Chuẩn Facebook 1-Click
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

        // Các emoji bullet phổ biến
        const bulletIcons = ['🔹', '👉', '✅', '✨', '⭐', '✔', '▪', '•', '🔸', '📍', '📌', '💡', '💎'];
        const sectionStarters = ['🔥', '💥', '⚡', '🎁', '🚚', '🛡️', '👉', '☎️', '📞', '🌐', '🏠', '🎯', '💯'];

        for (let i = 0; i < rawLines.length; i++) {
            let line = rawLines[i].trim();

            // Chuẩn hóa icon gạch đầu dòng: đảm bảo có 1 dấu cách sau icon
            for (const icon of bulletIcons) {
                if (line.startsWith(icon) && !line.startsWith(icon + ' ')) {
                    line = icon + ' ' + line.substring(icon.length).trim();
                    break;
                }
            }

            cleanedLines.push(line);
        }

        // 3. Tái cấu trúc khoảng thở chuẩn Facebook (Double line breaks giữa các phần)
        const formatted = [];
        let inBulletList = false;

        for (let i = 0; i < cleanedLines.length; i++) {
            const cur = cleanedLines[i];
            const isBullet = bulletIcons.some(ic => cur.startsWith(ic));
            const isSection = sectionStarters.some(st => cur.startsWith(st));

            if (cur === '') {
                // Giữ dòng trống
                if (formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                    formatted.push('');
                }
                inBulletList = false;
                continue;
            }

            // Nếu bắt đầu một khối mục mới (như Ưu đãi, Hotline, Hook) và phía trước chưa có dòng trống
            if (isSection && !isBullet && formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                formatted.push('');
            }

            // Nếu đang trong bullet list mà dòng này không phải bullet, thêm dòng trống tạo khoảng thở
            if (inBulletList && !isBullet && formatted.length > 0 && formatted[formatted.length - 1] !== '') {
                formatted.push('');
            }

            formatted.push(cur);
            inBulletList = isBullet;
        }

        // 4. Gộp thành văn bản chuẩn và loại bỏ dòng trống dư thừa ở đầu/cuối
        let resultText = formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();

        captionInput.value = resultText;
        updateLivePreview();
        showStatusAlert('✨ Đã tự động chuẩn hóa canh lề & ngắt dòng đẹp mắt chuẩn phong cách Facebook!', 'success');
    }

    /**
     * Mở Modal xuất bản với dữ liệu bài viết (Ảnh / Poster / Video)
     */
    function openModal(mediaInfo = {}) {
        const modal = document.getElementById('socialPublishModal');
        if (!modal) return;

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
        switchPlatform(mediaInfo.platform || currentPlatform || 'facebook');

        // Khởi tạo xem trước và chế độ xem
        toggleViewMode('editor');
        updateLivePreview();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
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
        }
    }

    /**
     * Chuyển đổi giữa 2 nền tảng Facebook và TikTok
     */
    function switchPlatform(platform) {
        currentPlatform = platform;

        const tabBtnFb = document.getElementById('tabBtnFacebook');
        const tabBtnTt = document.getElementById('tabBtnTiktok');
        const targetName = document.getElementById('targetPlatformName');
        const submitBtnText = document.getElementById('btnAutoPublishText');

        if (platform === 'facebook') {
            if (tabBtnFb) {
                tabBtnFb.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-blue-500/50 bg-blue-600/25 text-white font-bold transition-all shadow-md hover:bg-blue-600/35 cursor-pointer';
            }
            if (tabBtnTt) {
                tabBtnTt.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-white/10 bg-slate-800/40 text-slate-400 font-bold transition-all hover:bg-slate-800/80 hover:text-white cursor-pointer';
            }
            if (targetName) targetName.textContent = 'Facebook';
            if (submitBtnText) submitBtnText.textContent = '⚡ Tự Động Đăng Lên Facebook';
        } else {
            if (tabBtnTt) {
                tabBtnTt.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-pink-500/50 bg-pink-600/25 text-white font-bold transition-all shadow-md hover:bg-pink-600/35 cursor-pointer';
            }
            if (tabBtnFb) {
                tabBtnFb.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-white/10 bg-slate-800/40 text-slate-400 font-bold transition-all hover:bg-slate-800/80 hover:text-white cursor-pointer';
            }
            if (targetName) targetName.textContent = 'TikTok';
            if (submitBtnText) submitBtnText.textContent = '⚡ Tự Động Đăng Lên TikTok';
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

            const result = await res.json();

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

            const result = await res.json();

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
        openBrowserDirectLink,
        toggleViewMode,
        autoFormatFacebookText,
        updateLivePreview
    };
})();
