/**
 * Daily Note Quick Logger Module
 */
function initDailyNote() {
    const btnOpenDaily = document.getElementById('btnOpenDaily');
    if (!btnOpenDaily) return;

    btnOpenDaily.addEventListener('click', async () => {
        btnOpenDaily.disabled = true;
        try {
            const res = await fetch('/api/github/daily');
            const data = await res.json();
            if (!data.success || !data.daily) throw new Error('Cannot load daily note');

            if (typeof window.openNoteDrawer === 'function') {
                window.openNoteDrawer(data.daily.path);
            }

            const noteContentTextarea = document.getElementById('noteContentTextarea');
            if (data.daily.isNew && noteContentTextarea) {
                noteContentTextarea.value = data.daily.content;
                if (typeof window.switchMode === 'function') {
                    window.switchMode('edit');
                }
            }
        } catch (err) {
            alert(`Lỗi khi mở Daily Note: ${err.message}`);
        } finally {
            btnOpenDaily.disabled = false;
        }
    });
}
