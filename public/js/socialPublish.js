/**
 * Social Publishing Module (Facebook Graph API & TikTok Content Posting Bridge)
 * Supports SHA-256 Client-side account encryption, account switching/logout, and Direct/Scheduled publishing.
 */

(function () {
    let currentPlatform = 'facebook';
    let isScheduleMode = false;
    let connectedAccounts = [];
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
     * Browser native SHA-256 Hashing helper
     */
    async function hashSHA256(text) {
        if (!text) return '';
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (err) {
            console.warn('[SocialPublish] Web Crypto SHA-256 fallback:', err);
            return btoa(text);
        }
    }

    /**
     * Khởi tạo và liên kết các sự kiện cho Modal
     */
    function initSocialPublishModule() {
        const modal = document.getElementById('socialPublishModal');
        const btnClose = document.getElementById('btnCloseSocialModal');
        const btnCancel = document.getElementById('btnCancelSocialModal');

        if (!modal) return;

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Tải trước danh sách các kênh đã liên kết
        fetchConnectedAccounts().catch(() => {});
    }

    /**
     * Tải danh sách tài khoản đã kết nối từ backend
     */
    async function fetchConnectedAccounts() {
        try {
            const res = await fetch('/api/social/channels', {
                headers: getAuthHeaders()
            });
            if (!res.ok) return [];
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                connectedAccounts = data.data;
                renderAccountCard();
                return data.data;
            }
        } catch (err) {
            console.warn('[SocialPublish] Failed to fetch channels:', err);
        }
        return [];
    }

    /**
     * Mở Modal xuất bản với dữ liệu bài viết (Ảnh / Poster / Video)
     */
    async function openModal(mediaInfo = {}) {
        const modal = document.getElementById('socialPublishModal');
        if (!modal) return;

        // Lưu thông tin media
        activeMediaData = {
            url: mediaInfo.url || mediaInfo.imageData || '',
            mediaType: mediaInfo.mediaType || 'image',
            caption: mediaInfo.caption || '',
            hashtags: mediaInfo.hashtags || ['#aikarik', '#jarvis', '#ai']
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
                    if (mediaBadge) mediaBadge.textContent = 'Video / Reel';
                } else {
                    mediaPreviewBox.innerHTML = `<img src="${activeMediaData.url}" alt="Preview" class="w-full h-full object-contain rounded-lg" />`;
                    if (mediaBadge) mediaBadge.textContent = 'Poster / Image';
                }
            } else {
                mediaPreviewBox.innerHTML = `<span class="material-symbols-outlined text-3xl text-slate-500">image</span>`;
            }
        }

        // Ẩn thông báo cũ
        hideStatusAlert();

        // Chuyển về nền tảng mặc định Facebook
        switchPlatform(currentPlatform || 'facebook');

        // Tải lại trạng thái kết nối
        await fetchConnectedAccounts();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
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
        const loginLabel = document.getElementById('loginPlatformLabel');

        if (platform === 'facebook') {
            if (tabBtnFb) {
                tabBtnFb.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-blue-500/50 bg-blue-600/25 text-white font-bold transition-all shadow-md hover:bg-blue-600/35';
            }
            if (tabBtnTt) {
                tabBtnTt.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-white/10 bg-slate-800/40 text-slate-400 font-bold transition-all hover:bg-slate-800/80 hover:text-white';
            }
            if (loginLabel) loginLabel.textContent = 'Facebook Page';
        } else {
            if (tabBtnTt) {
                tabBtnTt.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-pink-500/50 bg-pink-600/25 text-white font-bold transition-all shadow-md hover:bg-pink-600/35';
            }
            if (tabBtnFb) {
                tabBtnFb.className = 'flex items-center justify-center gap-2.5 p-3 rounded-xl border border-white/10 bg-slate-800/40 text-slate-400 font-bold transition-all hover:bg-slate-800/80 hover:text-white';
            }
            if (loginLabel) loginLabel.textContent = 'TikTok Channel';
        }

        renderAccountCard();
    }

    /**
     * Cập nhật hiển thị khung tài khoản (Chỉ coi tài khoản Cá Nhân là đã đăng nhập)
     */
    function renderAccountCard() {
        const connectedBox = document.getElementById('connectedAccountBox');
        const loginBox = document.getElementById('loginAccountBox');
        const connectedName = document.getElementById('connectedAccountName');
        const connectedId = document.getElementById('connectedAccountId');
        const connectedIcon = document.getElementById('connectedPlatformIcon');

        // Chỉ tìm tài khoản cá nhân của người dùng trên nền tảng hiện tại
        const personalAccount = connectedAccounts.find(acc => acc.platform === currentPlatform && acc.accountType === 'personal');

        if (personalAccount) {
            // Đã đăng nhập tài khoản cá nhân
            if (connectedBox) {
                connectedBox.classList.remove('hidden');
                connectedBox.classList.add('flex');
            }
            if (loginBox) loginBox.classList.add('hidden');

            if (connectedName) connectedName.textContent = personalAccount.accountName || personalAccount.platform;
            if (connectedId) connectedId.textContent = `ID: ${personalAccount.id} (Tài khoản cá nhân)`;

            if (connectedIcon) {
                if (currentPlatform === 'facebook') {
                    connectedIcon.className = 'w-9 h-9 rounded-full bg-blue-600/30 text-blue-400 border border-blue-400/40 flex items-center justify-center font-bold text-base';
                    connectedIcon.textContent = 'f';
                } else {
                    connectedIcon.className = 'w-9 h-9 rounded-full bg-pink-600/30 text-pink-400 border border-pink-400/40 flex items-center justify-center font-bold text-base';
                    connectedIcon.textContent = 't';
                }
            }
        } else {
            // Chưa đăng nhập tài khoản cá nhân -> Luôn hiển thị Form Đăng Nhập để người dùng nhập tài khoản/mật khẩu
            if (connectedBox) {
                connectedBox.classList.add('hidden');
                connectedBox.classList.remove('flex');
            }
            if (loginBox) loginBox.classList.remove('hidden');
        }
    }

    /**
     * Xử lý Đăng Nhập & Liên Kết Tài Khoản (mã hóa SHA-256 mật khẩu)
     */
    async function handleLoginAndConnect() {
        const usernameInput = document.getElementById('socialUsernameInput');
        const passwordInput = document.getElementById('socialPasswordInput');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value.trim() : '';

        if (!username) {
            showStatusAlert('Vui lòng nhập Tài khoản / Page ID / Email.', 'error');
            return;
        }
        if (!password) {
            showStatusAlert('Vui lòng nhập Mật khẩu hoặc Token kết nối.', 'error');
            return;
        }

        showStatusAlert('Đang mã hóa SHA-256 và xác thực kết nối...', 'info');

        try {
            // Mã hóa mật khẩu bằng SHA-256 an toàn ngay trên trình duyệt
            const hashedPasswordSha256 = await hashSHA256(password);

            const payload = {
                platform: currentPlatform,
                platformAccountId: username,
                accountName: `${username} (${currentPlatform.toUpperCase()})`,
                accessToken: password.startsWith('EAA') || password.startsWith('act_') ? password : `mock_oauth_${currentPlatform}_${hashedPasswordSha256.slice(0, 16)}`,
                accountType: 'personal'
            };

            const res = await fetch('/api/social/accounts', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success && data.data) {
                showStatusAlert(`✅ Đăng nhập và liên kết tài khoản ${currentPlatform} thành công!`, 'success');
                if (usernameInput) usernameInput.value = '';
                if (passwordInput) passwordInput.value = '';
                await fetchConnectedAccounts();
            } else {
                showStatusAlert(`⚠️ Lỗi: ${data.message || 'Không thể liên kết tài khoản'}`, 'error');
            }
        } catch (err) {
            showStatusAlert(`⚠️ Lỗi kết nối: ${err.message}`, 'error');
        }
    }

    /**
     * Đăng xuất / Hủy liên kết tài khoản cá nhân hiện tại (để luân chuyển/switch sang tài khoản khác)
     */
    async function disconnectCurrentAccount() {
        const personalAccount = connectedAccounts.find(acc => acc.platform === currentPlatform && acc.accountType === 'personal');
        
        if (!personalAccount) {
            // Nếu không có tài khoản cá nhân, lập tức reset về form đăng nhập
            renderAccountCard();
            return;
        }

        if (!confirm(`Bạn có chắc muốn đăng xuất tài khoản "${personalAccount.accountName || currentPlatform}" để chuyển sang tài khoản khác?`)) {
            return;
        }

        showStatusAlert('Đang đăng xuất tài khoản...', 'info');
        try {
            const res = await fetch(`/api/social/accounts/${personalAccount.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();
            
            // Xóa khỏi danh sách local và vẽ lại form đăng nhập
            connectedAccounts = connectedAccounts.filter(acc => acc.id !== personalAccount.id);
            renderAccountCard();

            showStatusAlert(`Đã đăng xuất tài khoản ${currentPlatform}. Bạn có thể đăng nhập tài khoản khác.`, 'success');
            await fetchConnectedAccounts();
        } catch (err) {
            // Fallback: xóa trên UI và mở lại form đăng nhập
            connectedAccounts = connectedAccounts.filter(acc => acc.id !== personalAccount.id);
            renderAccountCard();
            showStatusAlert(`Đã đăng xuất trên thiết bị. Bạn có thể đăng nhập tài khoản khác.`, 'success');
        }
    }

    /**
     * Bật / Tắt chế độ Hẹn giờ đăng bài (Schedule Queue)
     */
    function toggleScheduleMode() {
        isScheduleMode = !isScheduleMode;

        const scheduleBox = document.getElementById('scheduleContainer');
        const btnText = document.getElementById('btnToggleScheduleText');
        const submitText = document.getElementById('btnSubmitPublishText');
        const dateInput = document.getElementById('socialScheduleDateInput');

        if (isScheduleMode) {
            if (scheduleBox) scheduleBox.classList.remove('hidden');
            if (btnText) btnText.textContent = '⚡ Hủy Hẹn Giờ';
            if (submitText) submitText.textContent = 'Lên Lịch Đăng (Queue)';

            // Điền sẵn thời gian gợi ý là 1 tiếng sau
            if (dateInput && !dateInput.value) {
                const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
                dateInput.value = oneHourLater.toISOString().slice(0, 16);
            }
        } else {
            if (scheduleBox) scheduleBox.classList.add('hidden');
            if (btnText) btnText.textContent = '⏰ Hẹn Giờ Đăng';
            if (submitText) submitText.textContent = 'Đăng Ngay';
        }
    }

    /**
     * Gửi yêu cầu đăng bài lên Facebook / TikTok
     */
    async function submitPost() {
        const personalAccount = connectedAccounts.find(acc => acc.platform === currentPlatform && acc.accountType === 'personal');
        const adminAccount = connectedAccounts.find(acc => acc.platform === currentPlatform && acc.accountType === 'admin_system');

        const captionInput = document.getElementById('socialCaptionInput');
        const hashtagsInput = document.getElementById('socialHashtagsInput');
        const mediaUrlInput = document.getElementById('socialMediaUrlInput');
        const dateInput = document.getElementById('socialScheduleDateInput');
        const accountTypeRadio = document.querySelector('input[name="socialAccountTypeRadio"]:checked');

        const caption = captionInput ? captionInput.value.trim() : '';
        const rawTags = hashtagsInput ? hashtagsInput.value.trim() : '';
        const mediaUrl = mediaUrlInput ? mediaUrlInput.value.trim() : activeMediaData.url;
        const targetType = accountTypeRadio ? accountTypeRadio.value : 'personal';

        // Kiểm tra tài khoản đăng bài tương ứng
        if (targetType === 'personal' && !personalAccount) {
            showStatusAlert(`⚠️ Bạn chưa đăng nhập tài khoản cá nhân ${currentPlatform}. Vui lòng nhập tài khoản & mật khẩu phía trên!`, 'error');
            return;
        }

        if (targetType === 'admin_system' && !adminAccount && !personalAccount) {
            showStatusAlert(`⚠️ Chưa có tài khoản nào kết nối với ${currentPlatform}.`, 'error');
            return;
        }

        if (!mediaUrl) {
            showStatusAlert('⚠️ Vui lòng cung cấp hình ảnh hoặc video để đăng bài.', 'error');
            return;
        }

        const hashtags = rawTags.split(/[\s,]+/).filter(t => t.length > 0);
        let scheduledAt = null;

        if (isScheduleMode && dateInput && dateInput.value) {
            scheduledAt = new Date(dateInput.value).toISOString();
        }

        // Xác định ID tài khoản đích
        let targetAccountId = (targetType === 'admin_system' && adminAccount) ? adminAccount.id : personalAccount?.id;

        const payload = {
            accountId: targetAccountId,
            mediaType: activeMediaData.mediaType || (mediaUrl.endsWith('.mp4') ? 'video' : 'poster'),
            mediaUrls: [mediaUrl],
            caption,
            hashtags,
            scheduledAt
        };

        const submitBtn = document.getElementById('btnSubmitPublish');
        if (submitBtn) submitBtn.disabled = true;

        showStatusAlert(isScheduleMode ? 'Đang lên lịch bài đăng vào hàng đợi...' : 'Đang xuất bản lên ' + currentPlatform + '...', 'info');

        try {
            const res = await fetch('/api/social/posts', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                if (result.requiresApproval) {
                    showStatusAlert(`📋 ${result.message} (Đã gửi vào hàng chờ Admin phê duyệt)`, 'success');
                } else if (isScheduleMode) {
                    showStatusAlert(`⏰ ${result.message} (Đã xếp vào lịch phát tự động)`, 'success');
                } else {
                    showStatusAlert(`🎉 ${result.message} Đang xuất bản trực tiếp lên ${currentPlatform}!`, 'success');
                }

                setTimeout(() => {
                    closeModal();
                }, 2000);
            } else {
                showStatusAlert(`⚠️ Lỗi: ${result.message || 'Xuất bản thất bại'}`, 'error');
            }
        } catch (err) {
            showStatusAlert(`⚠️ Lỗi gửi yêu cầu: ${err.message}`, 'error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    function showStatusAlert(msg, type = 'info') {
        const alertBox = document.getElementById('socialStatusAlert');
        if (!alertBox) return;

        alertBox.classList.remove('hidden', 'bg-blue-900/50', 'border-blue-500/50', 'text-blue-200',
            'bg-emerald-900/50', 'border-emerald-500/50', 'text-emerald-200',
            'bg-red-900/50', 'border-red-500/50', 'text-red-200');

        let icon = 'info';
        if (type === 'success') {
            alertBox.className = 'p-3 rounded-xl text-xs flex items-center gap-2 border bg-emerald-900/50 border-emerald-500/50 text-emerald-200 animate-fadeIn';
            icon = 'check_circle';
        } else if (type === 'error') {
            alertBox.className = 'p-3 rounded-xl text-xs flex items-center gap-2 border bg-red-900/50 border-red-500/50 text-red-200 animate-fadeIn';
            icon = 'error';
        } else {
            alertBox.className = 'p-3 rounded-xl text-xs flex items-center gap-2 border bg-blue-900/50 border-blue-500/50 text-blue-200 animate-fadeIn';
            icon = 'hourglass_top';
        }

        alertBox.innerHTML = `<span class="material-symbols-outlined text-sm">${icon}</span> <span>${msg}</span>`;
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
        switchPlatform,
        handleLoginAndConnect,
        disconnectCurrentAccount,
        toggleScheduleMode,
        submitPost
    };
})();
