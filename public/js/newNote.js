/**
 * Create New Note Modal Module
 */
function initNewNoteModal() {
    const btnNewNote = document.getElementById('btnNewNote');
    const newNoteModal = document.getElementById('newNoteModal');
    const btnCloseNewNoteModal = document.getElementById('btnCloseNewNoteModal');
    const btnCancelNewNote = document.getElementById('btnCancelNewNote');
    const btnSubmitNewNote = document.getElementById('btnSubmitNewNote');
    const newNotePathInput = document.getElementById('newNotePathInput');
    const newNoteContentInput = document.getElementById('newNoteContentInput');

    if (!btnNewNote || !newNoteModal) return;

    const newNoteTokenBadge = document.getElementById('newNoteTokenBadge');

    function updateNewNoteTokenCount() {
        if (!newNoteTokenBadge || !newNoteContentInput) return;
        const text = newNoteContentInput.value || '';
        const tokens = Math.ceil(text.length / 4);
        const costUsd = tokens * 0.00000125;
        const span = newNoteTokenBadge.querySelector('span:nth-child(2)');
        if (span) {
            span.textContent = `${tokens.toLocaleString()} tokens (~$${costUsd.toFixed(6)})`;
        }
    }

    if (newNoteContentInput) {
        newNoteContentInput.addEventListener('input', updateNewNoteTokenCount);
    }

    btnNewNote.addEventListener('click', () => {
        if (newNotePathInput) newNotePathInput.value = '';
        if (newNoteContentInput) newNoteContentInput.value = '# Tiêu đề ghi chú\n\nNội dung ghi chú mới...';
        updateNewNoteTokenCount();
        newNoteModal.classList.remove('hidden');
        newNoteModal.classList.add('flex');
    });

    function closeNewNoteModal() {
        newNoteModal.classList.add('hidden');
        newNoteModal.classList.remove('flex');
    }

    if (btnCloseNewNoteModal) btnCloseNewNoteModal.addEventListener('click', closeNewNoteModal);
    if (btnCancelNewNote) btnCancelNewNote.addEventListener('click', closeNewNoteModal);

    if (btnSubmitNewNote) {
        btnSubmitNewNote.addEventListener('click', async () => {
            const path = newNotePathInput ? newNotePathInput.value.trim() : '';
            const content = newNoteContentInput ? newNoteContentInput.value : '';

            if (!path) {
                alert('Vui lòng nhập đường dẫn file (Vd: Wiki/GhiChuMoi.md)');
                return;
            }

            const finalPath = path.endsWith('.md') ? path : `${path}.md`;
            btnSubmitNewNote.disabled = true;

            try {
                const res = await fetch('/api/github/file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: finalPath, content })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Tạo note thất bại');

                closeNewNoteModal();
                if (typeof window.openNoteDrawer === 'function') {
                    window.openNoteDrawer(finalPath);
                }
                if (typeof window.fetchAndRenderGraph === 'function') {
                    window.fetchAndRenderGraph();
                }
            } catch (err) {
                alert(`Lỗi: ${err.message}`);
            } finally {
                btnSubmitNewNote.disabled = false;
            }
        });
    }
}
