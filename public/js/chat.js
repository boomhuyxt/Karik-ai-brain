/**
 * Floating AI Chat Module - Ultra-Fast Text & Voice Assistant with Live Timer & File Attachment Support
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
                        attachmentHtml = `<div class="mt-1.5"><a href="${url}" target="_blank"><img src="${url}" alt="${name}" class="max-h-48 rounded-xl border border-purple-500/40 shadow-lg object-contain hover:scale-105 transition-transform" /></a></div>`;
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
            }, 50);
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
            const replyText = result.reply || result.message || 'Không có phản hồi';

            // Hiển thị phản hồi từ AI (Bên Trái - AI Bubble tự động vừa chiều dài chữ)
            const aiDiv = document.createElement('div');
            aiDiv.className = 'flex flex-col items-start self-start mr-auto w-fit min-w-[200px] max-w-[90%] sm:max-w-[85%] p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-slate-100 rounded-tl-none shadow-lg transition-all animate-fadeIn';
            const renderFn = typeof window.renderCustomMarkdown === 'function' ? window.renderCustomMarkdown : (t => t);

            const badgeHtml = isVoice
                ? `<span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1 py-0.2 rounded font-mono flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">graphic_eq</span> Voice</span>`
                : `<span class="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/40 px-1 py-0.2 rounded font-mono flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">bolt</span> Gemini Flash</span>`;

            const msgId = 'aimsg_' + Date.now();

            aiDiv.innerHTML = `
                <strong class="text-cyan-300 font-bold text-xs flex items-center justify-between w-full mb-1 text-glow">
                    <span class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm text-cyan-400">smart_toy</span>
                        AI Karik:
                        ${badgeHtml}
                    </span>
                    <span class="flex items-center gap-1.5">
                        <button type="button" class="btn-speak-msg text-slate-400 hover:text-cyan-300 transition-colors p-0.5 rounded" title="Nghe đọc nội dung này" data-msg-id="${msgId}">
                            <span class="material-symbols-outlined text-[12px]">volume_up</span>
                        </button>
                        <span class="text-[10px] text-cyan-300 font-mono flex items-center gap-1 bg-cyan-500/20 border border-cyan-400/40 px-1.5 py-0.5 rounded-full" title="Thời gian AI xử lý và phản hồi">
                            <span class="material-symbols-outlined text-[11px]">timer</span> ${totalDuration}s
                        </span>
                    </span>
                </strong>
                <div id="${msgId}" class="text-slate-100 font-medium text-xs sm:text-sm leading-relaxed border-t border-purple-500/20 pt-1.5 mt-1 w-full break-words">
                    ${renderFn(replyText)}
                </div>
            `;
            chatMessages.appendChild(aiDiv);

            // Bind manual speak button for on-demand playback
            const speakBtn = aiDiv.querySelector('.btn-speak-msg');
            if (speakBtn) {
                speakBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.jarvisVoice && typeof window.jarvisVoice.speakText === 'function') {
                        window.jarvisVoice.speakText(replyText).catch(() => {});
                    }
                });
            }

            // Auto-speak voice if user initiated via live voice call
            if (isVoice && window.jarvisVoice && typeof window.jarvisVoice.speakText === 'function') {
                window.jarvisVoice.speakText(replyText).catch(() => {});
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

