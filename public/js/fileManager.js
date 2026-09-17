/**
 * =========================================================================
 * FILE MANAGER & KNOWLEDGE FILE STORAGE JS MODULE (ADMIN UI)
 * =========================================================================
 */

let fmAllFiles = [];

/**
 * Mở Modal Quản Lý File Upload
 */
window.openFileManagerModal = function () {
    const modal = document.getElementById('fileManagerModal');
    if (modal) {
        modal.classList.remove('hidden');
        window.fetchAndRenderFileManagerFiles();
    }
};

/**
 * Đóng Modal Quản Lý File Upload
 */
window.closeFileManagerModal = function () {
    const modal = document.getElementById('fileManagerModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Gọi API lấy danh sách toàn bộ file kiến thức kho
 */
window.fetchAndRenderFileManagerFiles = async function () {
    const tbody = document.getElementById('fmTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-3xl animate-spin text-purple-500">sync</span>
                        <span>Đang tải danh sách file từ Supabase Storage...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    try {
        const res = await fetch('/api/inventory/files');
        const json = await res.json();

        if (!json.success || !Array.isArray(json.data)) {
            throw new Error(json.error || 'Không thể tải danh sách file');
        }

        fmAllFiles = json.data;
        window.renderFileManagerUI(fmAllFiles);
        window.populateFmShopFilter(fmAllFiles);
    } catch (err) {
        console.error('Lỗi tải danh sách file:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-red-500 font-semibold">
                        ⚠️ Lỗi khi tải file: ${err.message}
                    </td>
                </tr>
            `;
        }
    }
};

/**
 * Cập nhật bộ lọc Shop ID trong dropdown
 */
window.populateFmShopFilter = function (files) {
    const select = document.getElementById('fmShopFilter');
    if (!select) return;

    const currentVal = select.value;
    const shops = Array.from(new Set(files.map(f => f.shop_id).filter(Boolean)));

    let html = '<option value="ALL">Tất cả các Shop</option>';
    shops.forEach(s => {
        html += `<option value="${s}">${s}</option>`;
    });

    select.innerHTML = html;
    if (shops.includes(currentVal)) {
        select.value = currentVal;
    }
};

/**
 * Hiển thị dữ liệu lên bảng & cập nhật thống kê
 */
window.renderFileManagerUI = function (files) {
    const totalFilesEl = document.getElementById('fmTotalFiles');
    const totalItemsEl = document.getElementById('fmTotalItems');
    const inStockEl = document.getElementById('fmInStockCount');
    const outOfStockEl = document.getElementById('fmOutOfStockCount');
    const countLabel = document.getElementById('fmFileCountLabel');
    const tbody = document.getElementById('fmTableBody');

    let totalItems = 0;
    let totalInStock = 0;
    let totalOutOfStock = 0;

    files.forEach(f => {
        totalItems += Number(f.total_items || 0);
        totalInStock += Number(f.in_stock_count || 0);
        totalOutOfStock += Number(f.out_of_stock_count || 0);
    });

    if (totalFilesEl) totalFilesEl.textContent = files.length;
    if (totalItemsEl) totalItemsEl.textContent = totalItems.toLocaleString('vi-VN');
    if (inStockEl) inStockEl.textContent = totalInStock.toLocaleString('vi-VN');
    if (outOfStockEl) outOfStockEl.textContent = totalOutOfStock.toLocaleString('vi-VN');
    if (countLabel) countLabel.textContent = files.length;

    if (!tbody) return;

    if (files.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">folder_off</span>
                        <span>Chưa có file Excel/CSV nào được tải lên hệ thống.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let rowsHtml = '';
    files.forEach((file, idx) => {
        const dateStr = file.updated_at ? new Date(file.updated_at).toLocaleString('vi-VN') : 'Mới tạo';
        const isOutOfStock = file.out_of_stock_count > 0;

        rowsHtml += `
            <tr class="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2.5">
                        <span class="material-symbols-outlined text-emerald-500 text-lg">description</span>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-slate-200 text-xs">${file.file_name || 'inventory.xlsx'}</div>
                            <div class="text-[10px] text-slate-400 font-mono truncate max-w-xs">${file.file_path || 'Bucket: kho'}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600/30">
                        ${file.shop_id || 'default_shop'}
                    </span>
                </td>
                <td class="py-3 px-3 text-center">
                    <span class="font-bold text-slate-800 dark:text-slate-200">${file.total_items || 0}</span>
                </td>
                <td class="py-3 px-3 text-center">
                    <span class="inline-flex items-center gap-1 text-[11px] font-semibold ${isOutOfStock ? 'text-amber-500' : 'text-emerald-500'}">
                        <span class="h-1.5 w-1.5 rounded-full ${isOutOfStock ? 'bg-amber-500' : 'bg-emerald-500'}"></span>
                        ${isOutOfStock ? `Hết ${file.out_of_stock_count} SP` : 'Đủ hàng'}
                    </span>
                </td>
                <td class="py-3 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                    ${dateStr}
                </td>
                <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="window.previewFmFile('${file.id}')" title="Xem chi tiết các mặt hàng trong file"
                            class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer">
                            <span class="material-symbols-outlined text-xs">visibility</span>
                            <span>Xem Data</span>
                        </button>

                        <button onclick="window.deleteFmFile('${file.id}', '${file.file_name}')" title="Xóa file này"
                            class="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-all cursor-pointer">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
};

/**
 * Lọc bảng theo từ khóa tìm kiếm và Shop ID
 */
window.filterFileManagerTable = function () {
    const searchInput = document.getElementById('fmSearchInput');
    const shopFilter = document.getElementById('fmShopFilter');

    const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const shop = shopFilter ? shopFilter.value : 'ALL';

    const filtered = fmAllFiles.filter(f => {
        const matchShop = (shop === 'ALL' || f.shop_id === shop);
        const matchSearch = !search || 
            (f.file_name && f.file_name.toLowerCase().includes(search)) ||
            (f.shop_id && f.shop_id.toLowerCase().includes(search));
        return matchShop && matchSearch;
    });

    window.renderFileManagerUI(filtered);
};

/**
 * Xem trước các sản phẩm bên trong 1 file Excel
 */
window.previewFmFile = function (fileId) {
    const file = fmAllFiles.find(f => f.id === fileId);
    if (!file) return;

    const modal = document.getElementById('fmFilePreviewModal');
    const title = document.getElementById('fmPreviewTitle');
    const sub = document.getElementById('fmPreviewSub');
    const tbody = document.getElementById('fmPreviewTableBody');

    if (title) title.textContent = `File: ${file.file_name || 'inventory.xlsx'} (Shop: ${file.shop_id})`;
    if (sub) sub.textContent = `Tổng cộng ${file.total_items || 0} mặt hàng đã trích xuất`;

    if (tbody) {
        const items = Array.isArray(file.all_items) ? file.all_items : [];
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">Không có dữ liệu mặt hàng.</td></tr>`;
        } else {
            let html = '';
            items.forEach((item, index) => {
                const qty = Number(item.quantity || 0);
                const price = Number(item.price || 0);
                const isOut = qty <= 0;

                html += `
                    <tr class="hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                        <td class="py-2.5 px-3 text-slate-400 font-mono">${index + 1}</td>
                        <td class="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-100">${item.name || '-'}</td>
                        <td class="py-2.5 px-3 font-mono text-[11px] text-purple-600 dark:text-purple-300">${item.sku || '-'}</td>
                        <td class="py-2.5 px-3 text-slate-500 dark:text-slate-400">${item.compatible_models || '-'}</td>
                        <td class="py-2.5 px-3 text-center font-bold ${isOut ? 'text-red-500' : 'text-emerald-500'}">
                            ${qty} ${item.unit || 'cái'}
                        </td>
                        <td class="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                            ${price.toLocaleString('vi-VN')}đ
                        </td>
                        <td class="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">${item.location || '-'}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    }

    if (modal) modal.classList.remove('hidden');
};

/**
 * Đóng inner preview modal
 */
window.closeFmFilePreview = function () {
    const modal = document.getElementById('fmFilePreviewModal');
    if (modal) modal.classList.add('hidden');
};

/**
 * Xóa file kiến thức
 */
window.deleteFmFile = async function (fileId, fileName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa file "${fileName}" khỏi hệ thống? Dữ liệu tồn kho liên quan sẽ được gỡ bỏ.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/inventory/files/${fileId}`, {
            method: 'DELETE'
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Xóa thất bại');

        alert(`✅ Đã xóa file "${fileName}" thành công!`);
        window.fetchAndRenderFileManagerFiles();
    } catch (err) {
        alert(`❌ Lỗi khi xóa file: ${err.message}`);
    }
};

/**
 * Nạp file Excel mới trực tiếp từ Modal
 */
window.handleFileManagerUpload = function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const shopIdInput = document.getElementById('fmShopIdInput');
    const shop_id = (shopIdInput && shopIdInput.value.trim()) || 'shop_honda_01';

    const reader = new FileReader();
    reader.onload = async function (evt) {
        const base64Data = evt.target.result;
        try {
            const res = await fetch('/api/inventory/chat-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shop_id,
                    fileName: file.name,
                    base64Data
                })
            });

            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Nạp file thất bại');

            alert(`🎉 Nạp file "${file.name}" cho shop "${shop_id}" thành công!\nĐã trích xuất ${json.total_items} sản phẩm và lưu lên Cloud.`);
            e.target.value = '';
            window.fetchAndRenderFileManagerFiles();
        } catch (err) {
            alert(`❌ Lỗi nạp file: ${err.message}`);
        }
    };
    reader.readAsDataURL(file);
};

window.initFileManagerModule = function () {
    console.log('[FileManager] Module initialized.');
};
