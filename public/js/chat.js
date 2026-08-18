/**
 * Floating AI Chat Module - Ultra-Fast Silent Text Chat with On-Demand Voice Support
 */
function initAIChat() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const aiTimerBadge = document.getElementById('aiTimerBadge');
    const aiTimerValue = document.getElementById('aiTimerValue');

    if (!chatForm || !chatInput || !chatMessages) return;

    let timerInterval = null;

    if (window.jarvisVoice && typeof window.jarvisVoice.init === 'function') {
        window.jarvisVoice.init();
    }

    window.sendChatMessage = async function(message, isVoice = false) {
        if (!message || !message.trim()) return;

        // Fully transparent User Message
        const userDiv = document.createElement('div');
        userDiv.className = 'bg-transparent p-1.5 text-white self-end ml-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all animate-fadeIn';
        userDiv.innerHTML = `<strong class="text-purple-300 font-bold text-xs flex items-center gap-1.5 mb-0.5 text-glow"><span class="material-symbols-outlined text-sm text-purple-400">account_circle</span> Bạn ${isVoice ? '(Giọng nói)' : ''}:</strong><div class="text-white font-semibold text-xs leading-relaxed tracking-wide">${escapeHtml(message)}</div>`;
        chatMessages.appendChild(userDiv);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Start Live Response Timer
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

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    provider: 'gemini'
                })
            });
            const result = await res.json();

            // Calculate total execution time
            const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
            const replyText = result.reply || result.message || 'Không có phản hồi';

            // Fully transparent AI Message
            const aiDiv = document.createElement('div');
            aiDiv.className = 'bg-transparent p-1.5 text-slate-100 self-start mr-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all animate-fadeIn';
            const renderFn = typeof window.renderCustomMarkdown === 'function' ? window.renderCustomMarkdown : (t => t);

            const badgeHtml = isVoice
                ? `<span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1 py-0.2 rounded font-mono flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">graphic_eq</span> Voice</span>`
                : `<span class="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/40 px-1 py-0.2 rounded font-mono flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">bolt</span> Gemini Flash</span>`;

            const msgId = 'aimsg_' + Date.now();

            aiDiv.innerHTML = `
                <strong class="text-cyan-300 font-bold text-xs flex items-center justify-between mb-1 text-glow">
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
                <div id="${msgId}" class="text-slate-100 font-medium text-xs leading-relaxed border-t border-purple-500/20 pt-1 mt-0.5">
                    ${renderFn(replyText)}
                </div>
            `;
            chatMessages.appendChild(aiDiv);

            // Bind manual speak button for on-demand playback only
            const speakBtn = aiDiv.querySelector('.btn-speak-msg');
            if (speakBtn) {
                speakBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.jarvisVoice && typeof window.jarvisVoice.speakText === 'function') {
                        window.jarvisVoice.speakText(replyText).catch(() => {});
                    }
                });
            }

            // ONLY auto-speak voice if user initiated via live voice call
            if (isVoice && window.jarvisVoice && typeof window.jarvisVoice.speakText === 'function') {
                window.jarvisVoice.speakText(replyText).catch(() => {});
            }

            // Live refresh Graph View & Token Progress Bars
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
        if (message) {
            window.sendChatMessage(message, false);
        }
    });

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }
}

