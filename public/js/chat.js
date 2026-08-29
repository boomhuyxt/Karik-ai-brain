/**
 * Floating AI Chat Module - Fully Transparent Text-Only Style with Live Timer, Gemini Voice & File Upload (Max 50MB)
 */
function initAIChat() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const aiTimerBadge = document.getElementById('aiTimerBadge');
    const aiTimerValue = document.getElementById('aiTimerValue');

    const btnAttachFile = document.getElementById('btnAttachFile');
    const chatFileInput = document.getElementById('chatFileInput');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const filePreviewName = document.getElementById('filePreviewName');
    const filePreviewSize = document.getElementById('filePreviewSize');
    const filePreviewIcon = document.getElementById('filePreviewIcon');
    const btnRemoveFile = document.getElementById('btnRemoveFile');

    if (!chatForm || !chatInput || !chatMessages) return;

    let timerInterval = null;
    let pendingFile = null;

    if (window.jarvisVoice && typeof window.jarvisVoice.init === 'function') {
        window.jarvisVoice.init();
    }

    // --- File Attachment Handler (Max 50MB) ---
    if (btnAttachFile && chatFileInput) {
        btnAttachFile.addEventListener('click', () => {
            chatFileInput.click();
        });

        chatFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes
            if (file.size > MAX_SIZE) {
                alert(`⚠️ File "${file.name}" vượt quá dung lượng tối đa 50MB (${(file.size / (1024 * 1024)).toFixed(1)}MB). Vui lòng chọn file nhỏ hơn!`);
                chatFileInput.value = '';
                return;
            }

            pendingFile = file;

            if (filePreviewContainer && filePreviewName && filePreviewSize && filePreviewIcon) {
                filePreviewName.textContent = file.name;
                const mb = (file.size / (1024 * 1024)).toFixed(2);
                filePreviewSize.textContent = `${mb} MB`;

                const ext = file.name.split('.').pop().toLowerCase();
                if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
                    filePreviewIcon.textContent = 'image';
                } else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) {
                    filePreviewIcon.textContent = 'movie';
                } else if (ext === 'pdf') {
                    filePreviewIcon.textContent = 'picture_as_pdf';
                } else if (['doc', 'docx'].includes(ext)) {
                    filePreviewIcon.textContent = 'description';
                } else {
                    filePreviewIcon.textContent = 'attach_file';
                }

                filePreviewContainer.classList.remove('hidden');
                filePreviewContainer.classList.add('flex');
            }
        });

        if (btnRemoveFile) {
            btnRemoveFile.addEventListener('click', () => {
                clearPendingFile();
            });
        }
    }

    // --- Image & Poster Studio Open Handlers ---
    const btnOpenImageEditorHeader = document.getElementById('btnOpenImageEditorHeader');
    const btnOpenImageEditorFooter = document.getElementById('btnOpenImageEditorFooter');

    if (btnOpenImageEditorHeader) {
        btnOpenImageEditorHeader.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.openImageEditor === 'function') {
                window.openImageEditor(window.lastUploadedImageUrl || null);
            }
        });
    }

    if (btnOpenImageEditorFooter) {
        btnOpenImageEditorFooter.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.openImageEditor === 'function') {
                window.openImageEditor(window.lastUploadedImageUrl || null);
            }
        });
    }

    // Global Document Click Delegation for Studio Buttons
    document.addEventListener('click', (e) => {
        const studioBtn = e.target.closest('#btnOpenImageEditorHeader, #btnOpenImageEditorFooter, .btn-open-studio');
        if (studioBtn) {
            e.preventDefault();
            if (typeof window.openImageEditor === 'function') {
                window.openImageEditor(window.lastUploadedImageUrl || null);
            }
        }
    });

    // --- Bridge: Receive Edited Image from Image Studio ---
    window.attachStudioImageToChat = async function(dataUrl, fileName = 'poster.png') {
        try {
            window.lastStudioEditedImage = dataUrl;
            window.lastUploadedImageUrl = dataUrl;

            // Convert base64 dataUrl to File object
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], fileName, { type: 'image/png' });

            pendingFile = file;

            if (filePreviewContainer && filePreviewName && filePreviewSize && filePreviewIcon) {
                filePreviewName.textContent = file.name;
                const mb = (file.size / (1024 * 1024)).toFixed(2);
                filePreviewSize.textContent = `${mb} MB (Từ Studio)`;
                filePreviewIcon.textContent = 'palette';

                filePreviewContainer.classList.remove('hidden');
                filePreviewContainer.classList.add('flex');
            }

            if (chatInput) {
                chatInput.focus();
                if (!chatInput.value) {
                    chatInput.placeholder = "Đã đính kèm ảnh từ Studio! Nhập tin nhắn và gửi...";
                }
            }
        } catch (err) {
            console.error('[Chat] Failed to attach studio image:', err);
        }
    };

    // --- Bridge: Receive Completed Poster directly from AI Studio Autonomous Engine ---
    window.receiveCompletedPosterFromStudio = function(dataUrl, config = {}) {
        if (!chatMessages) return;

        window.lastStudioEditedImage = dataUrl;
        window.lastUploadedImageUrl = dataUrl;

        const posterDiv = document.createElement('div');
        posterDiv.className = 'flex flex-col items-start self-start mr-auto w-fit min-w-[240px] max-w-[90%] sm:max-w-[85%] p-4 rounded-2xl bg-gradient-to-b from-slate-900/95 via-purple-950/40 to-slate-900/95 border-2 border-purple-400/60 text-slate-100 rounded-tl-none shadow-2xl transition-all animate-fadeIn my-2';
        
        const title = config.title || 'Poster Đã Hoàn Thành';
        const fileName = `poster_${Date.now()}.png`;

        posterDiv.innerHTML = `
            <strong class="text-cyan-300 font-bold text-xs flex items-center justify-between w-full mb-2 text-glow">
                <span class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-sm text-cyan-400">auto_awesome</span>
                    AI Karik Studio:
                    <span class="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-400/40 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                        <span class="material-symbols-outlined text-[10px]">palette</span> Poster Tự Động
                    </span>
                </span>
                <span class="text-[10px] text-emerald-300 font-mono flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 rounded-full">
                    <span class="material-symbols-outlined text-[11px]">check_circle</span> Hoàn tất
                </span>
            </strong>
            <p class="text-xs text-purple-200 font-medium mb-2 leading-relaxed">✨ AI Karik đã tự động vào Studio, nạp ảnh của bạn, chỉnh màu sắc, gắn tiêu đề & chú thích để tạo thành poster hoàn chỉnh:</p>
            <div class="rounded-xl overflow-hidden border border-purple-400/50 shadow-2xl bg-black/40 flex justify-center p-1.5 max-w-full">
                <img src="${dataUrl}" alt="${escapeHtml(title)}" class="max-h-96 w-auto max-w-full object-contain rounded-lg shadow-lg cursor-pointer hover:scale-[1.02] transition-transform" onclick="window.openImageEditor('${dataUrl}')" />
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 w-full">
                <button type="button" onclick="window.triggerSocialPublishFromChat('facebook', 'bot')" class="flex-1 min-w-[140px] px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-blue-400/40">
                    <span class="material-symbols-outlined text-sm text-cyan-200">smart_toy</span>
                    <span>🤖 Đăng Lên FB (AI Bot)</span>
                </button>
                <a href="${dataUrl}" download="${fileName}" class="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 text-center cursor-pointer">
                    <span class="material-symbols-outlined text-sm">download</span>
                    <span>Tải Poster (PNG)</span>
                </a>
                <button type="button" onclick="window.openImageEditor('${dataUrl}')" class="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-400/50 text-purple-200 hover:text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-sm text-cyan-300">palette</span>
                    <span>Mở Trong Studio</span>
                </button>
            </div>
        `;

        chatMessages.appendChild(posterDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    function clearPendingFile() {
        pendingFile = null;
        if (chatFileInput) chatFileInput.value = '';
        if (filePreviewContainer) {
            filePreviewContainer.classList.add('hidden');
            filePreviewContainer.classList.remove('flex');
        }
    }

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    window.sendChatMessage = async function(message, isVoice = false) {
        if ((!message || !message.trim()) && !pendingFile) return;

        let attachedFileResult = null;
        let attachmentHtml = '';

        // 1. Tải file lên server nếu có file đính kèm
        if (pendingFile) {
            try {
                const base64Data = await readFileAsBase64(pendingFile);
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: pendingFile.name,
                        fileSize: pendingFile.size,
                        fileType: pendingFile.type,
                        base64Data
                    })
                });

                const uploadData = await uploadRes.json();
                if (uploadData.success && uploadData.file) {
                    attachedFileResult = uploadData.file;
                    const url = attachedFileResult.url;
                    const name = escapeHtml(attachedFileResult.name);
                    const mb = (attachedFileResult.size / (1024 * 1024)).toFixed(2);
                    const cat = attachedFileResult.category;

                    if (cat === 'image') {
                        window.lastUploadedImageUrl = url;
                        attachmentHtml = `
                            <div class="mt-1.5 flex flex-col gap-1">
                                <a href="${url}" target="_blank"><img src="${url}" alt="${name}" class="max-h-48 rounded-xl border border-purple-500/40 shadow-lg object-contain hover:scale-105 transition-transform" /></a>
                                <button type="button" onclick="window.openImageEditor('${url}')" class="self-end inline-flex items-center gap-1 text-[10px] bg-purple-950/80 hover:bg-purple-800 border border-purple-400/40 text-purple-200 px-2 py-0.5 rounded-full transition-all active:scale-95 shadow-sm cursor-pointer">
                                    <span class="material-symbols-outlined text-[12px] text-cyan-300">palette</span> <span>🎨 Mở trong Studio</span>
                                </button>
                            </div>`;
                    } else if (cat === 'video') {
                        attachmentHtml = `<div class="mt-1.5"><video src="${url}" controls class="max-h-48 w-full rounded-xl border border-purple-500/40 shadow-lg"></video></div>`;
                    } else if (cat === 'pdf') {
                        attachmentHtml = `<div class="mt-1.5"><a href="${url}" target="_blank" download class="inline-flex items-center gap-2 bg-purple-900/60 hover:bg-purple-800/80 border border-cyan-400/40 px-3 py-1.5 rounded-xl text-cyan-200 text-xs font-mono transition-all"><span class="material-symbols-outlined text-base text-red-400">picture_as_pdf</span> <span>${name}</span> <span class="text-[10px] opacity-75">(${mb}MB)</span></a></div>`;
                    } else {
                        attachmentHtml = `<div class="mt-1.5"><a href="${url}" target="_blank" download class="inline-flex items-center gap-2 bg-purple-900/60 hover:bg-purple-800/80 border border-cyan-400/40 px-3 py-1.5 rounded-xl text-cyan-200 text-xs font-mono transition-all"><span class="material-symbols-outlined text-base text-blue-400">description</span> <span>${name}</span> <span class="text-[10px] opacity-75">(${mb}MB)</span></a></div>`;
                    }
                } else {
                    alert('⚠️ Lỗi upload file: ' + (uploadData.error || 'Thất bại'));
                    return;
                }
            } catch (err) {
                alert('⚠️ Lỗi tải file lên server: ' + err.message);
                return;
            } finally {
                clearPendingFile();
            }
        }

        const userText = message ? message.trim() : '';

        // Hiển thị tin nhắn người dùng (Bên Phải - User Bubble tự động vừa chiều dài chữ)
        const userDiv = document.createElement('div');
        userDiv.className = 'flex flex-col items-end self-end ml-auto w-fit min-w-[120px] max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl bg-purple-900/50 border border-purple-500/40 text-white rounded-tr-none shadow-lg transition-all animate-fadeIn';
        userDiv.innerHTML = `
            <strong class="text-purple-300 font-bold text-xs flex items-center justify-end gap-1.5 mb-1 text-glow w-full">
                <span>Bạn ${isVoice ? '(Giọng nói)' : ''}</span>
                <span class="material-symbols-outlined text-sm text-purple-400">account_circle</span>
            </strong>
            ${userText ? `<div class="text-white font-semibold text-xs sm:text-sm leading-relaxed tracking-wide text-right break-words w-full">${escapeHtml(userText)}</div>` : ''}
            ${attachmentHtml}
        `;
        chatMessages.appendChild(userDiv);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Bắt đầu đếm thời gian phản hồi
        const startTime = performance.now();
        if (aiTimerBadge && aiTimerValue) {
            aiTimerBadge.classList.remove('hidden');
            aiTimerBadge.classList.add('flex');
            aiTimerValue.textContent = '0.0s';

            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
                aiTimerValue.textContent = `${elapsed}s`;
            }, 100);
        }

        // Tạo nội dung gửi tới API bao gồm liên kết file nếu có
        let fullPrompt = userText;
        if (attachedFileResult) {
            fullPrompt += `\n[Đính kèm file: ${attachedFileResult.name} (${attachedFileResult.category}) tại ${attachedFileResult.url}]`;
        }

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: fullPrompt
                })
            });
            const result = await res.json();

            const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);

            // Hiển thị phản hồi từ AI (Bên Trái - AI Bubble tự động vừa chiều dài chữ)
            const aiDiv = document.createElement('div');
            aiDiv.className = 'flex flex-col items-start self-start mr-auto w-fit min-w-[200px] max-w-[90%] sm:max-w-[85%] p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-slate-100 rounded-tl-none shadow-lg transition-all animate-fadeIn';
            const renderFn = typeof window.renderCustomMarkdown === 'function' ? window.renderCustomMarkdown : (t => t);

            const voiceBadgeHtml = `<span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1 py-0.2 rounded font-mono flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">volume_up</span> Chromium Voice</span>`;

            const replyText = result.reply || result.message || 'Không có phản hồi';
            const agentInfo = result.agent || { id: 'orchestrator', model: result.model || 'gemini-3.6-flash' };
            const tokenInfo = result.tokens || { totalTokens: 0, inputTokens: 0, outputTokens: 0 };
            const msgId = 'aimsg_' + Date.now();
            
            // Extract AI Poster JSON configuration if provided
            let parsedPosterConfig = null;
            try {
                const posterJsonMatch = replyText.match(/```(?:json:poster-config|json)\s*\n([\s\S]*?)\n```/i);
                if (posterJsonMatch && posterJsonMatch[1]) {
                    const parsed = JSON.parse(posterJsonMatch[1]);
                    if (parsed && (parsed.title || parsed.filter || parsed.preset || parsed.badge)) {
                        parsedPosterConfig = parsed;
                    }
                }
            } catch (err) {
                console.warn('[Chat] Failed to parse poster config JSON:', err);
            }

            // Image Studio Quick Action Card when user edits/works with an image
            const targetImageUrl = (attachedFileResult && attachedFileResult.category === 'image') 
                ? attachedFileResult.url 
                : (window.lastUploadedImageUrl || null);

            let studioActionCardHtml = '';
            const isImageEditingIntent = agentInfo.id === 'image' || Boolean(parsedPosterConfig) || /(?:edit|chỉnh|xóa nền|tách nền|thay nền|poster|banner|studio|crop|cắt|filter|ghép ảnh)/i.test(userText);

            if (targetImageUrl && isImageEditingIntent) {
                const escapedConfigAttr = parsedPosterConfig ? escapeHtml(JSON.stringify(parsedPosterConfig)) : '';
                const posterTitleHint = parsedPosterConfig && parsedPosterConfig.title ? `Tiêu đề: "${parsedPosterConfig.title}"` : 'Đã nạp bố cục vào Studio';

                studioActionCardHtml = `
                    <div class="my-3 p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-400/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                        <div class="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                            <img src="${targetImageUrl}" alt="Ảnh cần chỉnh sửa" class="w-12 h-12 rounded-xl object-cover border-2 border-purple-400/60 shadow flex-shrink-0 cursor-pointer" onclick="window.openImageEditor('${targetImageUrl}', ${parsedPosterConfig ? JSON.stringify(parsedPosterConfig).replace(/"/g, '&quot;') : 'null'})" />
                            <div class="min-w-0 flex-1">
                                <div class="text-xs font-bold text-purple-200 flex items-center gap-1.5 truncate">
                                    <span class="material-symbols-outlined text-sm text-cyan-400">auto_awesome</span>
                                    <span>Poster Tự Động Đã Sẵn Sàng</span>
                                </div>
                                <div class="text-[10px] text-slate-300 truncate">${escapeHtml(posterTitleHint)}</div>
                            </div>
                        </div>
                        <button type="button" onclick="window.openImageEditor('${targetImageUrl}', ${parsedPosterConfig ? JSON.stringify(parsedPosterConfig).replace(/"/g, '&quot;') : 'null'})" class="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer border border-purple-300/40">
                            <span class="material-symbols-outlined text-sm text-cyan-200">palette</span>
                            <span>Mở Studio & Xem Poster Ngay</span>
                        </button>
                    </div>
                `;

                // Auto-execute live sequential Studio poster building & send completed image back to chat
                if (parsedPosterConfig || /(?:làm poster|tạo poster|poster|thiết kế poster)/i.test(userText)) {
                    setTimeout(() => {
                        if (typeof window.autoBuildAndSendPoster === 'function') {
                            window.autoBuildAndSendPoster(targetImageUrl, parsedPosterConfig || {});
                        } else if (typeof window.openImageEditor === 'function') {
                            window.openImageEditor(targetImageUrl, parsedPosterConfig);
                        }
                    }, 500);
                } else if (/(?:edit ảnh|chỉnh sửa ảnh|chỉnh ảnh|vào studio|mở studio|xóa nền|thêm chữ)/i.test(userText)) {
                    setTimeout(() => {
                        if (typeof window.openImageEditor === 'function') {
                            window.openImageEditor(targetImageUrl, parsedPosterConfig);
                        }
                    }, 500);
                }
            }

            // Extract AI Social Publish JSON configuration if provided
            let parsedSocialConfig = null;
            try {
                const socialJsonMatch = replyText.match(/```(?:json:social-publish|json)\s*\n([\s\S]*?)\n```/i);
                if (socialJsonMatch && socialJsonMatch[1]) {
                    const parsed = JSON.parse(socialJsonMatch[1]);
                    if (parsed && (parsed.platform || parsed.caption || parsed.directUrls)) {
                        parsedSocialConfig = parsed;
                        if (parsed.caption) window.lastProductCaption = parsed.caption;
                        if (parsed.hashtags) window.lastProductHashtags = parsed.hashtags;
                    }
                }
            } catch (err) {
                console.warn('[Chat] Failed to parse social config JSON:', err);
            }

            // Also check if poster config contains product caption
            if (parsedPosterConfig) {
                if (parsedPosterConfig.productCaption) {
                    window.lastProductCaption = parsedPosterConfig.productCaption;
                }
                if (parsedPosterConfig.hashtags) {
                    window.lastProductHashtags = parsedPosterConfig.hashtags;
                }
            }

            // Fallback product caption if none parsed from JSON
            const fallbackCaption = (result.reply || result.message || '')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/!\[.*?\]\(.*?\)/g, '')
                .replace(/\[CHỈ THỊ.*?\]/g, '')
                .trim();
            if (!window.lastProductCaption && fallbackCaption) {
                window.lastProductCaption = fallbackCaption;
            }

            // Social Media Direct Browser Publishing Action Card
            let socialActionCardHtml = '';
            const isSocialPostingIntent = agentInfo.id === 'social' || Boolean(parsedSocialConfig) || /(?:đăng bài|xuất bản|facebook|tiktok|post bài|viết bài fb|viết bài tiktok|caption|status mxh)/i.test(userText);

            if (isSocialPostingIntent) {
                const postPlatform = (parsedSocialConfig && parsedSocialConfig.platform) ? parsedSocialConfig.platform : (/(?:tiktok|clip|video)/i.test(userText) ? 'tiktok' : 'facebook');
                const postHeadline = (parsedSocialConfig && parsedSocialConfig.headline) ? parsedSocialConfig.headline : 'Bài Viết Đã Sẵn Sàng Xuất Bản';
                const platformBadgeName = postPlatform === 'tiktok' ? 'TikTok Studio' : 'Facebook';
                const platformBadgeClass = postPlatform === 'tiktok' ? 'bg-pink-600/30 text-pink-300 border-pink-500/40' : 'bg-blue-600/30 text-blue-300 border-blue-500/40';

                socialActionCardHtml = `
                    <div class="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/90 via-slate-900 to-pink-950/90 border border-blue-500/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 w-full animate-fadeIn">
                        <div class="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                <span class="material-symbols-outlined text-white text-lg">smart_toy</span>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                    <span>${escapeHtml(postHeadline)}</span>
                                    <span class="text-[9px] ${platformBadgeClass} border px-1.5 py-0.2 rounded font-mono">${platformBadgeName}</span>
                                </div>
                                <div class="text-[10px] text-cyan-300 truncate">🤖 AI Browser Bot: Mở Chrome/Edge tự động đăng bài & ảnh Studio</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button type="button" onclick="window.triggerSocialPublishFromChat('${postPlatform}', 'bot')" class="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-blue-400/50">
                                <span class="material-symbols-outlined text-sm text-cyan-200">smart_toy</span>
                                <span>🤖 AI Vào Trình Duyệt Đăng Bài</span>
                            </button>
                            <button type="button" onclick="window.triggerSocialPublishFromChat('${postPlatform}', 'modal')" class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border border-white/10" title="Xem & Tùy chỉnh trước khi đăng">
                                <span class="material-symbols-outlined text-sm">tune</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            let imageHtml = '';
            if (result.imageData) {
                const imgFormat = result.mimeType?.includes('svg') ? 'svg' : 'jpg';
                imageHtml = `
                    <div class="mt-2.5 rounded-xl overflow-hidden border border-purple-500/40 bg-slate-950/80 p-2 shadow-2xl flex flex-col items-center gap-2 max-w-md w-full">
                        <img src="${result.imageData}" alt="Gemini Imagen 3 Image" class="w-full h-auto max-h-80 rounded-lg object-contain border border-purple-500/20 shadow-md hover:scale-102 transition-transform cursor-pointer" onclick="window.open('${result.imageData}', '_blank')" />
                        <div class="flex items-center justify-between w-full text-slate-300 text-[10px] font-mono px-1">
                            <span class="flex items-center gap-1 text-purple-300"><span class="material-symbols-outlined text-xs">auto_awesome</span> Gemini Imagen 3</span>
                            <a href="${result.imageData}" download="gemini-imagen3-${Date.now()}.${imgFormat}" class="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 px-2 py-0.5 rounded text-white flex items-center gap-1 transition-all">
                                <span class="material-symbols-outlined text-xs">download</span> Tải ảnh
                            </a>
                        </div>
                    </div>
                `;
            }

            aiDiv.innerHTML = `
                <strong class="text-cyan-300 font-bold text-xs flex items-center justify-between w-full mb-1 text-glow">
                    <span class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm text-cyan-400">smart_toy</span>
                        AI JarVis Assistant:
                        ${voiceBadgeHtml}
                    </span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" class="btn-publish-social bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30 hover:from-blue-600/50 hover:to-pink-600/50 text-white border border-purple-400/40 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all shadow-sm" title="Mở Trình Duyệt Đăng Bài Lên Facebook / TikTok">
                            <span class="material-symbols-outlined text-[12px] text-cyan-300">smart_toy</span>
                            <span>Đăng Bài MXH</span>
                        </button>
                        <span class="text-[10px] text-cyan-300 font-mono flex items-center gap-1 bg-cyan-500/20 border border-cyan-400/40 px-1.5 py-0.5 rounded-full" title="Thời gian AI xử lý và phản hồi">
                            <span class="material-symbols-outlined text-[11px]">timer</span> ${totalDuration}s
                        </span>
                    </div>
                </strong>
                <div id="${msgId}" class="chat-markdown text-slate-100 font-medium text-xs sm:text-sm leading-relaxed border-t border-purple-500/20 pt-1.5 mt-1 w-full break-words">
                    ${renderFn(replyText)}
                    ${imageHtml}
                    ${studioActionCardHtml}
                    ${socialActionCardHtml}
                </div>
                <div class="w-full flex items-center justify-between border-t border-slate-700/50 mt-2 pt-1 text-[10px] text-slate-400 font-mono">
                    <span class="flex items-center gap-1 text-emerald-400" title="Độ tiêu hao Token thực tế (In: ${tokenInfo.inputTokens} | Out: ${tokenInfo.outputTokens})">
                        <span class="material-symbols-outlined text-[11px]">token</span>
                        <strong>${tokenInfo.totalTokens || 0}</strong> Tokens (In: ${tokenInfo.inputTokens || 0} | Out: ${tokenInfo.outputTokens || 0})
                    </span>
                    <span class="text-slate-500 text-[9px] bg-slate-800/60 px-1 rounded">
                        Model: ${agentInfo.model || 'gemini-3.1-flash'}
                    </span>
                </div>
            `;
            chatMessages.appendChild(aiDiv);

            // Bind global trigger function for chat action card
            window.triggerSocialPublishFromChat = function(platform, mode = 'modal') {
                if (window.socialPublish && typeof window.socialPublish.openModal === 'function') {
                    // Ưu tiên lấy ảnh mới nhất từ Studio hoặc ảnh upload gần nhất
                    let mediaUrl = window.lastStudioEditedImage || result.imageData || window.lastUploadedImageUrl || '';
                    let mediaType = (mediaUrl && mediaUrl.endsWith('.mp4')) ? 'video' : 'image';
                    
                    let cleanCaption = (parsedSocialConfig && parsedSocialConfig.caption) 
                        ? parsedSocialConfig.caption 
                        : (window.lastProductCaption || (result.reply || result.message || '')
                            .replace(/```[\s\S]*?```/g, '')
                            .replace(/!\[.*?\]\(.*?\)/g, '')
                            .replace(/\[CHỈ THỊ.*?\]/g, '')
                            .trim());

                    window.lastProductCaption = cleanCaption;

                    window.socialPublish.openModal({
                        url: mediaUrl,
                        mediaType,
                        caption: cleanCaption.slice(0, 2000),
                        hashtags: parsedSocialConfig?.hashtags || window.lastProductHashtags || ['#aikarik', '#sanpham', '#viral', '#facebook'],
                        platform: platform || parsedSocialConfig?.platform || 'facebook'
                    });

                    if (platform) {
                        window.socialPublish.switchPlatform(platform);
                    }
                }
            };

            // Bind Social Publish Modal button
            const publishBtn = aiDiv.querySelector('.btn-publish-social');
            if (publishBtn) {
                publishBtn.addEventListener('click', () => {
                    if (typeof window.triggerSocialPublishFromChat === 'function') {
                        window.triggerSocialPublishFromChat(parsedSocialConfig?.platform || 'facebook');
                    }
                });
            }

            if (isVoice && window.jarvisVoice && typeof window.jarvisVoice.playVoiceResponse === 'function') {
                window.jarvisVoice.playVoiceResponse(null, null, result.reply || result.message || '');
            }

            if (typeof window.fetchAndRenderGraph === 'function') {
                window.fetchAndRenderGraph();
            }
            if (typeof window.fetchSystemTokenUsage === 'function') {
                window.fetchSystemTokenUsage();
            }
        } catch (err) {
            const errDiv = document.createElement('div');
            errDiv.className = 'bg-transparent p-1.5 text-red-300 text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]';
            errDiv.innerHTML = `<strong>Lỗi:</strong> ${err.message}`;
            chatMessages.appendChild(errDiv);
        } finally {
            clearInterval(timerInterval);
            if (aiTimerBadge) {
                aiTimerBadge.classList.add('hidden');
                aiTimerBadge.classList.remove('flex');
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message || pendingFile) {
            window.sendChatMessage(message, false);
        }
    });

    // --- Draggable Standalone Chat Window Feature ---
    initDraggableChatWindow();

    function initDraggableChatWindow() {
        const chatBoxContainer = document.getElementById('chatBoxContainer');
        const chatHeader = chatBoxContainer ? chatBoxContainer.querySelector('.chat-header-inner') : null;

        if (!chatBoxContainer || !chatHeader) return;

        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        chatHeader.addEventListener('mousedown', startDrag);
        chatHeader.addEventListener('touchstart', startDrag, { passive: false });

        function startDrag(e) {
            if (chatBoxContainer.classList.contains('user-fullscreen-chat')) return;
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;

            isDragging = true;
            chatHeader.classList.add('cursor-grabbing');

            const rect = chatBoxContainer.getBoundingClientRect();
            const computedLeft = rect.left;
            const computedTop = rect.top;

            chatBoxContainer.style.bottom = 'auto';
            chatBoxContainer.style.right = 'auto';
            chatBoxContainer.style.left = `${computedLeft}px`;
            chatBoxContainer.style.top = `${computedTop}px`;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            initialLeft = computedLeft;
            initialTop = computedTop;

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('touchmove', onDrag, { passive: false });
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }

        function onDrag(e) {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const deltaX = clientX - startX;
            const deltaY = clientY - startY;

            let newLeft = initialLeft + deltaX;
            let newTop = initialTop + deltaY;

            // Viewport boundary protection (10px padding from screen edges)
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const containerWidth = chatBoxContainer.offsetWidth;
            const containerHeight = chatBoxContainer.offsetHeight;

            newLeft = Math.max(10, Math.min(newLeft, windowWidth - containerWidth - 10));
            newTop = Math.max(10, Math.min(newTop, windowHeight - containerHeight - 10));

            chatBoxContainer.style.left = `${newLeft}px`;
            chatBoxContainer.style.top = `${newTop}px`;
        }

        function stopDrag() {
            if (!isDragging) return;
            isDragging = false;
            chatHeader.classList.remove('cursor-grabbing');

            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
        }
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
}
