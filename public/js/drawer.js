/**
 * Markdown Reader & Live Editor Drawer Module
 */
function initNoteDrawer() {
    const drawer = document.getElementById('noteDrawer');
    const drawerTitle = document.getElementById('drawerTitle');
    const drawerShaBadge = document.getElementById('drawerShaBadge');
    const readView = document.getElementById('readView');
    const editView = document.getElementById('editView');
    const noteContentTextarea = document.getElementById('noteContentTextarea');

    const btnTabRead = document.getElementById('btnTabRead');
    const btnTabEdit = document.getElementById('btnTabEdit');
    const btnTabSplit = document.getElementById('btnTabSplit');
    const btnSaveNote = document.getElementById('btnSaveNote');
    const btnCloseDrawer = document.getElementById('btnCloseDrawer');

    let currentOpenedNote = null;
    window.currentMode = 'read';

    // Helper: Update Note Token Stats dynamically
    window.updateNoteTokenStats = function (content = '') {
        const charCount = typeof content === 'string' ? content.length : 0;
        const wordCount = typeof content === 'string' && content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
        const tokens = Math.ceil(charCount / 4); // Standard ~4 characters per token
        const costUsd = tokens * 0.00000125; // Gemini Flash 3.5 input rate ($1.25/1M tokens)
        const costVnd = Math.round(costUsd * 25400 * 100) / 100;

        const statNoteTokens = document.getElementById('statNoteTokens');
        const statEstimatedCost = document.getElementById('statEstimatedCost');
        const statCostVnd = document.getElementById('statCostVnd');
        const statCharCount = document.getElementById('statCharCount');
        const statWordCount = document.getElementById('statWordCount');
        const drawerHeaderTokens = document.getElementById('drawerHeaderTokens');

        if (statNoteTokens) statNoteTokens.textContent = tokens.toLocaleString();
        if (statCharCount) statCharCount.textContent = charCount.toLocaleString();
        if (statWordCount) statWordCount.textContent = `(${wordCount.toLocaleString()} từ)`;
        if (statEstimatedCost) statEstimatedCost.textContent = `$${costUsd.toFixed(6)}`;
        if (statCostVnd) statCostVnd.textContent = `(~${costVnd > 0 && costVnd < 0.01 ? '<0.01' : costVnd.toLocaleString('vi-VN')} VNĐ)`;
        if (drawerHeaderTokens) drawerHeaderTokens.textContent = `${tokens.toLocaleString()} tok`;
    };

    // Helper: Fetch System-wide Token Usage Summary & Render Progress Bars
    window.fetchSystemTokenUsage = async function () {
        const legendTotalTokensValue = document.getElementById('legendTotalTokensValue');
        const statSystemTokens = document.getElementById('statSystemTokens');
        const tokenProviderBars = document.getElementById('tokenProviderBars');

        try {
            const res = await fetch('/api/tokens');
            const data = await res.json();
            
            let totalVal = '0';
            let providers = [];

            if (data && data.total !== undefined) {
                totalVal = String(data.total);
            }
            if (data && data.providers && Array.isArray(data.providers)) {
                providers = data.providers;
            }

            if (legendTotalTokensValue) legendTotalTokensValue.textContent = totalVal;
            if (statSystemTokens) statSystemTokens.textContent = totalVal;

            if (tokenProviderBars && providers.length > 0) {
                tokenProviderBars.innerHTML = providers.map(p => {
                    const usedText = p.used >= 1000 ? `${(p.used / 1000).toFixed(1)}k` : p.used;
                    const maxText = p.max >= 1000 ? `${Math.round(p.max / 1000)}k` : p.max;
                    const badgeHtml = p.isLinked 
                        ? `<span class="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">Linked</span>`
                        : `<span class="text-[9px] px-1 py-0.2 rounded bg-white/5 text-on-surface-variant/50 font-mono">Unset</span>`;

                    return `
                        <div class="flex flex-col gap-1 text-xs">
                            <div class="flex justify-between items-center">
                                <div class="flex items-center gap-1.5">
                                    <span class="font-mono font-bold" style="color: ${p.color}">${p.name}</span>
                                    ${badgeHtml}
                                </div>
                                <span class="font-mono text-on-surface-variant/90 text-[11px]"><strong class="text-white">${usedText}</strong> / ${maxText}</span>
                            </div>
                            <div class="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500" style="width: ${Math.max(p.percentage, p.used > 0 ? 3 : 0)}%; background-color: ${p.color}; box-shadow: 0 0 8px ${p.color}"></div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.warn('System tokens fetch error:', err);
            if (legendTotalTokensValue) legendTotalTokensValue.textContent = '0';
            if (statSystemTokens) statSystemTokens.textContent = '0';
        }
    };

    // Initial system token fetch & periodic real-time refresh (every 3 seconds)
    fetchSystemTokenUsage();
    setInterval(fetchSystemTokenUsage, 3000);

    window.openNoteDrawer = async function (path) {
        if (!drawer || !readView) return;
        drawer.classList.remove('translate-x-full');
        if (drawerTitle) drawerTitle.textContent = path;
        if (drawerShaBadge) drawerShaBadge.textContent = 'SHA: Loading...';
        readView.innerHTML = '<p class="text-on-surface-variant italic">Đang tải ghi chú từ GitHub...</p>';
        updateNoteTokenStats('');
        switchMode('read');

        try {
            const res = await fetch(`/api/github/file?path=${encodeURIComponent(path)}`);
            const data = await res.json();

            if (!data.success || !data.file) {
                throw new Error('Could not fetch file content');
            }

            currentOpenedNote = data.file;
            if (drawerShaBadge) {
                drawerShaBadge.textContent = `SHA: ${currentOpenedNote.sha ? currentOpenedNote.sha.substring(0, 7) : 'New File'}`;
            }
            if (noteContentTextarea) {
                noteContentTextarea.value = currentOpenedNote.content || '';
            }

            readView.innerHTML = renderCustomMarkdown(currentOpenedNote.content || '');
            updateNoteTokenStats(currentOpenedNote.content || '');
            fetchSystemTokenUsage();
        } catch (err) {
            readView.innerHTML = `<p class="text-red-400">Lỗi khi tải file: ${err.message}</p>`;
        }
    };

    window.renderCustomMarkdown = function (content) {
        if (!content) return '';

        // 1. Convert markdown link [text](image_url) to ![text](image_url) if url points to an image
        let processed = content.replace(/(?<!!)\[([^\]]+)\]\((https?:\/\/[^\s\)]+|(?:\/uploads\/[^\s\)]+))\)/gi, (match, text, url) => {
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('.png') || lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.webp') || lowerUrl.includes('.gif') || lowerUrl.includes('/uploads/') || lowerUrl.includes('pollinations.ai') || lowerUrl.includes('7860') || lowerUrl.includes('txt2img')) {
                return `![${text}](${url})`;
            }
            return match;
        });

        // 2. Convert standalone image URLs into markdown image syntax
        processed = processed.replace(/(?:^|\n)(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s\)]*)?)(?:\n|$)/gi, '\n\n![AI Image]($1)\n\n');

        // 3. Handle Obsidian wikilinks [[NoteName|Alias]]
        processed = processed.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, alias) => {
            const displayText = alias || target;
            const cleanTarget = target.trim().replace(/'/g, "\\'");
            return `<span class="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded-md font-semibold text-xs cursor-pointer hover:bg-primary/30 transition-all shadow-[0_0_8px_rgba(211,187,255,0.2)]" onclick="window.openNoteDrawer('${cleanTarget}')"><span class="material-symbols-outlined text-xs">link</span> ${displayText.trim()}</span>`;
        });

        if (window.marked) {
            const renderer = new marked.Renderer();
            renderer.image = function (tokenOrHref, maybeTitle, maybeText) {
                let cleanHref = '';
                let altText = 'AI Generated Visual';

                if (typeof tokenOrHref === 'object' && tokenOrHref !== null) {
                    cleanHref = tokenOrHref.href || '';
                    altText = tokenOrHref.text || tokenOrHref.title || 'AI Generated Visual';
                } else {
                    cleanHref = tokenOrHref || '';
                    altText = maybeText || maybeTitle || 'AI Generated Visual';
                }

                if (typeof cleanHref !== 'string') {
                    cleanHref = String(cleanHref || '');
                }

                return `
                    <div class="my-3 rounded-2xl overflow-hidden bg-slate-950/90 border border-purple-500/40 shadow-2xl transition-all duration-300 hover:border-cyan-400/60 max-w-full">
                        <div class="flex items-center justify-between px-3 py-1.5 bg-purple-950/60 border-b border-purple-500/30 text-[11px] text-purple-200">
                            <span class="flex items-center gap-1.5 font-medium truncate max-w-[70%]">
                                <span class="material-symbols-outlined text-sm text-cyan-400">photo_library</span>
                                <span>${altText}</span>
                            </span>
                            <a href="${cleanHref}" target="_blank" download class="inline-flex items-center gap-1 text-cyan-300 hover:text-white font-mono transition-colors text-[10px] bg-cyan-500/20 hover:bg-cyan-500/30 px-2 py-0.5 rounded-md border border-cyan-400/30">
                                <span class="material-symbols-outlined text-xs">download</span> Mở / Tải ảnh
                            </a>
                        </div>
                        <div class="p-2 flex justify-center items-center bg-black/40">
                            <img src="${cleanHref}" alt="${altText}" class="max-h-96 w-auto max-w-full object-contain rounded-xl shadow-lg transition-transform duration-300 hover:scale-[1.01] cursor-pointer" loading="lazy" onclick="window.open('${cleanHref}', '_blank')" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'p-3 text-center text-xs text-amber-300 bg-amber-950/40 rounded-xl border border-amber-500/30 flex items-center justify-center gap-2\\'><span class=\\'material-symbols-outlined text-sm\\'>broken_image</span> Không thể tải ảnh: <span class=\\'font-mono text-[10px] truncate max-w-xs\\'>${cleanHref}</span></div>';" />
                        </div>
                    </div>
                `;
            };
            return marked.parse(processed, {
                renderer,
                breaks: true,
                gfm: true
            });
        }
        return processed;
    };

    function closeDrawer() {
        if (drawer) drawer.classList.add('translate-x-full');
        currentOpenedNote = null;
    }

    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);

    window.insertFormatting = function (prefix, suffix = '') {
        const textarea = document.getElementById('noteContentTextarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);
        const replacement = prefix + (selected || 'nội dung') + suffix;
        textarea.value = text.substring(0, start) + replacement + text.substring(end);
        textarea.focus();
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + (selected.length || 'nội dung'.length);

        readView.innerHTML = renderCustomMarkdown(textarea.value);
        updateNoteTokenStats(textarea.value);
    };

    if (readView) {
        readView.addEventListener('dblclick', () => {
            switchMode('edit');
            if (noteContentTextarea) noteContentTextarea.focus();
        });
    }

    if (noteContentTextarea) {
        noteContentTextarea.addEventListener('input', () => {
            if (window.currentMode === 'split' || window.currentMode === 'read') {
                readView.innerHTML = renderCustomMarkdown(noteContentTextarea.value);
            }
            updateNoteTokenStats(noteContentTextarea.value);
        });
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            if (currentOpenedNote && drawer && !drawer.classList.contains('translate-x-full')) {
                e.preventDefault();
                if (btnSaveNote) btnSaveNote.click();
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            if (currentOpenedNote && drawer && !drawer.classList.contains('translate-x-full')) {
                e.preventDefault();
                const nextMode = window.currentMode === 'read' ? 'edit' : 'read';
                switchMode(nextMode);
            }
        }
    });

    window.switchMode = function (mode) {
        window.currentMode = mode;
        if (!readView || !editView) return;

        if (mode === 'read') {
            readView.classList.remove('hidden');
            editView.classList.add('hidden');
            if (btnTabRead) btnTabRead.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center gap-1';
            if (btnTabEdit) btnTabEdit.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:bg-white/10 flex items-center gap-1';
            if (btnTabSplit) btnTabSplit.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:bg-white/10 flex items-center gap-1';

            if (noteContentTextarea && noteContentTextarea.value) {
                readView.innerHTML = renderCustomMarkdown(noteContentTextarea.value);
            }
        } else if (mode === 'edit') {
            readView.classList.add('hidden');
            editView.classList.remove('hidden');
            if (btnTabEdit) btnTabEdit.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center gap-1';
            if (btnTabRead) btnTabRead.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:bg-white/10 flex items-center gap-1';
            if (btnTabSplit) btnTabSplit.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:bg-white/10 flex items-center gap-1';
            if (noteContentTextarea) noteContentTextarea.focus();
        } else if (mode === 'split') {
            readView.classList.remove('hidden');
            editView.classList.remove('hidden');
            if (btnTabSplit) btnTabSplit.className = 'px-2.5 py-1 text-xs font-semibold rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center gap-1';
            if (btnTabRead) btnTabRead.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:bg-white/10 flex items-center gap-1';
            if (btnTabEdit) btnTabEdit.className = 'px-2.5 py-1 text-xs font-semibold rounded-md text-on-surface-variant hover:bg-white/10 flex items-center gap-1';
            if (noteContentTextarea && noteContentTextarea.value) {
                readView.innerHTML = renderCustomMarkdown(noteContentTextarea.value);
            }
            if (noteContentTextarea) noteContentTextarea.focus();
        }
    };

    if (btnTabRead) btnTabRead.addEventListener('click', () => switchMode('read'));
    if (btnTabEdit) btnTabEdit.addEventListener('click', () => switchMode('edit'));
    if (btnTabSplit) btnTabSplit.addEventListener('click', () => switchMode('split'));

    if (btnSaveNote) {
        btnSaveNote.addEventListener('click', async () => {
            if (!currentOpenedNote || !currentOpenedNote.path) return;

            if (!currentOpenedNote.path.endsWith('.md')) {
                alert('Lỗi: Chỉ hỗ trợ lưu các file định dạng Markdown (.md)');
                return;
            }

            const newContent = noteContentTextarea ? noteContentTextarea.value : '';
            btnSaveNote.disabled = true;
            btnSaveNote.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span><span>Đang lưu GitHub...</span>`;

            try {
                const res = await fetch('/api/github/file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: currentOpenedNote.path,
                        content: newContent,
                        sha: currentOpenedNote.sha
                    })
                });

                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to save');

                currentOpenedNote = data.file;
                if (drawerShaBadge) {
                    drawerShaBadge.textContent = `SHA: ${currentOpenedNote.sha ? currentOpenedNote.sha.substring(0, 7) : 'Synced'}`;
                }
                readView.innerHTML = renderCustomMarkdown(currentOpenedNote.content);
                updateNoteTokenStats(currentOpenedNote.content || '');
                fetchSystemTokenUsage();

                btnSaveNote.innerHTML = `<span class="material-symbols-outlined text-sm">check</span><span>Đã lưu GitHub!</span>`;
                setTimeout(() => {
                    btnSaveNote.disabled = false;
                    btnSaveNote.innerHTML = `<span class="material-symbols-outlined text-sm">cloud_upload</span><span>Lưu GitHub (Ctrl+S)</span>`;
                }, 1500);

                if (typeof window.fetchAndRenderGraph === 'function') {
                    window.fetchAndRenderGraph();
                }
            } catch (err) {
                alert(`Lưu thất bại: ${err.message}`);
                btnSaveNote.disabled = false;
                btnSaveNote.innerHTML = `<span class="material-symbols-outlined text-sm">cloud_upload</span><span>Lưu GitHub (Ctrl+S)</span>`;
            }
        });
    }
}
