/**
 * Post Office & Shipping Label Printing Module (Bưu Cục Đơn Hàng)
 */
let cachedPostOfficeOrders = [];
let currentFilterStatus = 'ALL';

function initPostOfficeModule() {
    const btnPostOfficeOrders = document.getElementById('btnPostOfficeOrders');
    const btnPostOfficeOrdersMobile = document.getElementById('btnPostOfficeOrdersMobile');
    const poSearchInput = document.getElementById('poSearchInput');

    if (btnPostOfficeOrders) {
        btnPostOfficeOrders.addEventListener('click', openPostOfficeModal);
    }
    if (btnPostOfficeOrdersMobile) {
        btnPostOfficeOrdersMobile.addEventListener('click', () => {
            openPostOfficeModal();
            const mobileNavMenu = document.getElementById('mobileNavMenu');
            const mobileMenuIcon = document.getElementById('mobileMenuIcon');
            if (mobileNavMenu) mobileNavMenu.classList.add('hidden');
            if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
        });
    }

    if (poSearchInput) {
        poSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterAndRenderOrders(query, currentFilterStatus);
        });
    }
}

async function openPostOfficeModal() {
    const modal = document.getElementById('postOfficeModal');
    if (modal) {
        modal.classList.remove('hidden');
        await fetchAndRenderPostOfficeOrders();
    }
}

function closePostOfficeModal() {
    const modal = document.getElementById('postOfficeModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function fetchAndRenderPostOfficeOrders() {
    const poOrdersTableBody = document.getElementById('poOrdersTableBody');
    const poTotalOrders = document.getElementById('poTotalOrders');
    const poPendingPrint = document.getElementById('poPendingPrint');
    const poShippedCount = document.getElementById('poShippedCount');
    const poDeliveredCount = document.getElementById('poDeliveredCount');

    try {
        const res = await fetch(`/api/inventory/post-office-orders?t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Không thể tải danh sách đơn hàng bưu cục.');
        }

        cachedPostOfficeOrders = data.data || [];

        // Calculate statistics
        const total = cachedPostOfficeOrders.length;
        const pending = cachedPostOfficeOrders.filter(o => !o.order_status || o.order_status === 'PENDING').length;
        const shipped = cachedPostOfficeOrders.filter(o => o.order_status === 'PRINTED' || o.order_status === 'SHIPPED').length;
        const delivered = cachedPostOfficeOrders.filter(o => o.order_status === 'DELIVERED').length;

        if (poTotalOrders) poTotalOrders.textContent = total;
        if (poPendingPrint) poPendingPrint.textContent = pending;
        if (poShippedCount) poShippedCount.textContent = shipped;
        if (poDeliveredCount) poDeliveredCount.textContent = delivered;

        const searchInput = document.getElementById('poSearchInput');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        filterAndRenderOrders(query, currentFilterStatus);

    } catch (err) {
        console.error('[PostOffice] Fetch Error:', err);
        if (poOrdersTableBody) {
            poOrdersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-red-400 font-mono">
                        ⚠️ Lỗi nạp đơn hàng: ${err.message}
                    </td>
                </tr>
            `;
        }
    }
}

function filterPostOfficeOrders(status) {
    currentFilterStatus = status;
    
    // Update active tab buttons
    document.querySelectorAll('.po-filter-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-sm');
        btn.classList.add('bg-slate-100', 'dark:bg-white/5', 'text-slate-600', 'dark:text-slate-300');
    });

    const activeBtn = document.getElementById(`filterBtn_${status}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-100', 'dark:bg-white/5', 'text-slate-600', 'dark:text-slate-300');
        activeBtn.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-sm');
    }

    const searchInput = document.getElementById('poSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    filterAndRenderOrders(query, status);
}

function filterAndRenderOrders(query, status) {
    let filtered = [...cachedPostOfficeOrders];

    if (status && status !== 'ALL') {
        if (status === 'PENDING') {
            filtered = filtered.filter(o => !o.order_status || o.order_status === 'PENDING');
        } else {
            filtered = filtered.filter(o => o.order_status === status);
        }
    }

    if (query) {
        filtered = filtered.filter(o => 
            (o.tracking_number || '').toLowerCase().includes(query) ||
            (o.order_id || '').toLowerCase().includes(query) ||
            (o.customer_name || '').toLowerCase().includes(query) ||
            (o.customer_phone || '').toLowerCase().includes(query) ||
            (o.customer_address || '').toLowerCase().includes(query) ||
            (o.item_name || '').toLowerCase().includes(query) ||
            (o.sku || '').toLowerCase().includes(query) ||
            (o.shop_id || '').toLowerCase().includes(query)
        );
    }

    renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('poOrdersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-10 text-center text-slate-400 font-mono">
                    <span class="material-symbols-outlined text-4xl block mb-2 opacity-50">inbox</span>
                    Không có đơn hàng nào phù hợp với bộ lọc hiện tại.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const trackingNum = order.tracking_number || order.order_id || 'VN-' + (order.id ? order.id.slice(0, 8).toUpperCase() : 'ORDER');
        const formattedDate = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '---';
        const rawStatus = order.order_status || 'PENDING';

        let statusBadge = '';
        if (rawStatus === 'PENDING') {
            statusBadge = `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-400/30">CHỜ IN VẬN ĐƠN</span>`;
        } else if (rawStatus === 'PRINTED') {
            statusBadge = `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30">ĐÃ IN PHIẾU</span>`;
        } else if (rawStatus === 'SHIPPED') {
            statusBadge = `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-400/30">ĐANG GIAO HÀNG</span>`;
        } else if (rawStatus === 'DELIVERED') {
            statusBadge = `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30">GIAO THÀNH CÔNG</span>`;
        } else {
            statusBadge = `<span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-400/30">${rawStatus}</span>`;
        }

        const totalPrice = Number(order.total_amount || (Number(order.quantity_sold || 1) * Number(order.unit_price || 0))) || 0;
        const formattedTotal = totalPrice.toLocaleString('vi-VN') + ' đ';

        return `
            <tr class="hover:bg-amber-500/5 transition-colors">
                <!-- Mã Vận Đơn -->
                <td class="py-3 px-3">
                    <div class="font-mono font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <span class="material-symbols-outlined text-sm">qr_code</span>
                        <span>${escapeHtml(trackingNum)}</span>
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">${formattedDate}</div>
                    <div class="text-[10px] text-purple-700 dark:text-purple-400 font-semibold mt-0.5">Shop: ${escapeHtml(order.shop_id || 'Mặc định')}</div>
                </td>

                <!-- Người Nhận & Địa Chỉ -->
                <td class="py-3 px-3 max-w-[220px]">
                    <div class="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <span class="material-symbols-outlined text-xs text-slate-400">person</span>
                        <span>${escapeHtml(order.customer_name || 'Khách vãng lai')}</span>
                    </div>
                    <div class="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                        <span class="material-symbols-outlined text-xs">call</span>
                        <span>${escapeHtml(order.customer_phone || 'Chưa cung cấp')}</span>
                    </div>
                    <div class="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5" title="${escapeHtml(order.customer_address || '')}">
                        📍 ${escapeHtml(order.customer_address || 'Địa chỉ nhận tại quầy')}
                    </div>
                </td>

                <!-- Chi tiết mặt hàng -->
                <td class="py-3 px-3">
                    <div class="font-medium text-slate-800 dark:text-slate-100">${escapeHtml(order.item_name || 'Sản phẩm')}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        SL: <span class="font-bold text-amber-700 dark:text-amber-400">${order.quantity_sold || 1}</span> × ${Number(order.unit_price || 0).toLocaleString('vi-VN')} đ
                    </div>
                </td>

                <!-- Tiền thu hộ COD -->
                <td class="py-3 px-3">
                    <div class="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                        ${formattedTotal}
                    </div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Thu tiền COD</div>
                </td>

                <!-- Trạng Thái -->
                <td class="py-3 px-3 text-center">
                    ${statusBadge}
                </td>

                <!-- Hành Động (In & Đổi Status) -->
                <td class="py-3 px-3 text-right">
                    <div class="flex items-center justify-end gap-1.5 flex-wrap">
                        <button onclick="window.printShippingLabel('${escapeHtml(order.id || trackingNum)}')" title="In Phiếu Gửi Hàng Chuẩn Vận Đơn"
                            class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">print</span> In Vận Đơn
                        </button>
                        
                        <select onchange="window.updateOrderStatusAction('${escapeHtml(order.id || trackingNum)}', this.value)"
                            class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs rounded-lg border border-slate-300 dark:border-white/10 px-2 py-1.5 focus:border-amber-500 focus:outline-none cursor-pointer">
                            <option value="PENDING" ${rawStatus === 'PENDING' ? 'selected' : ''}>Chờ in</option>
                            <option value="PRINTED" ${rawStatus === 'PRINTED' ? 'selected' : ''}>Đã in</option>
                            <option value="SHIPPED" ${rawStatus === 'SHIPPED' ? 'selected' : ''}>Đang giao</option>
                            <option value="DELIVERED" ${rawStatus === 'DELIVERED' ? 'selected' : ''}>Đã giao</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// In Phiếu Vận Đơn Chuẩn E-Commerce
async function printShippingLabel(orderIdOrKey) {
    const order = cachedPostOfficeOrders.find(o => o.id === orderIdOrKey || o.order_id === orderIdOrKey || o.tracking_number === orderIdOrKey);
    if (!order) {
        alert('Không tìm thấy thông tin đơn hàng để in!');
        return;
    }

    const trackingNum = order.tracking_number || order.order_id || 'VN-' + (order.id ? order.id.slice(0, 8).toUpperCase() : 'ORDER');
    const orderDate = order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const totalPrice = Number(order.total_amount || (Number(order.quantity_sold || 1) * Number(order.unit_price || 0))) || 0;
    const formattedTotal = totalPrice.toLocaleString('vi-VN') + ' VNĐ';

    // Tạo SVG Barcode giả lập độ nét cao
    const barcodeSvg = generateBarcodeSvg(trackingNum);

    const labelContainer = document.getElementById('shippingLabelContent');
    if (!labelContainer) return;

    labelContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #000; padding: 12px; border: 2px solid #000; border-radius: 6px;">
            <!-- Header Bưu Cục -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px;">
                <div>
                    <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">JARVIS EXPRESS LOGISTICS</div>
                    <div style="font-size: 10px; color: #333;">Dịch vụ Chuyển Phát Nhanh & Thu Hộ COD Toàn Quốc</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; font-weight: bold; background: #000; color: #fff; padding: 2px 6px; border-radius: 3px;">TIÊU CHUẨN</div>
                </div>
            </div>

            <!-- Barcode & Tracking Number -->
            <div style="text-align: center; margin: 10px 0; border-bottom: 1px dashed #000; padding-bottom: 8px;">
                ${barcodeSvg}
                <div style="font-size: 15px; font-weight: 900; letter-spacing: 2px; margin-top: 4px; font-family: monospace;">${escapeHtml(trackingNum)}</div>
                <div style="font-size: 9px; color: #555;">Ngày tạo đơn: ${orderDate} | Shop: ${escapeHtml(order.shop_id || 'Mặc định')}</div>
            </div>

            <!-- Sender & Recipient Box -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 8px;">
                <!-- Người Gửi -->
                <div style="border-right: 1px dashed #000; padding-right: 6px;">
                    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #444;">Từ (Người Gửi):</div>
                    <div style="font-size: 11px; font-weight: bold;">CỬA HÀNG ${escapeHtml((order.shop_id || 'KHO CHÍNH').toUpperCase())}</div>
                    <div style="font-size: 10px;">Hotline: 1900-8888</div>
                    <div style="font-size: 9px; color: #444;">Kho Tổng Jarvis AI Express Hub</div>
                </div>

                <!-- Người Nhận -->
                <div style="padding-left: 2px;">
                    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #444;">Đến (Người Nhận):</div>
                    <div style="font-size: 12px; font-weight: 900; color: #000;">${escapeHtml(order.customer_name || 'Khách hàng')}</div>
                    <div style="font-size: 11px; font-weight: bold;">SĐT: ${escapeHtml(order.customer_phone || '---')}</div>
                    <div style="font-size: 10px; line-height: 1.2; margin-top: 2px;">Đ/C: ${escapeHtml(order.customer_address || 'Địa chỉ nhận hàng')}</div>
                </div>
            </div>

            <!-- Item Table -->
            <div style="margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 6px;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Nội Dung Gói Hàng:</div>
                <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #ddd; background: #f5f5f5;">
                            <th style="text-align: left; padding: 2px 4px;">Sản phẩm</th>
                            <th style="text-align: center; padding: 2px 4px;">SL</th>
                            <th style="text-align: right; padding: 2px 4px;">Đơn giá</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 3px 4px;">${escapeHtml(order.item_name || 'Sản phẩm đặt mua')}</td>
                            <td style="text-align: center; padding: 3px 4px; font-weight: bold;">${order.quantity_sold || 1}</td>
                            <td style="text-align: right; padding: 3px 4px;">${Number(order.unit_price || 0).toLocaleString('vi-VN')} đ</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- COD Cash & Signature -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #fafafa; border: 1.5px solid #000; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px;">
                <div>
                    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">TIỀN THU NGƯỜI NHẬN (COD):</div>
                    <div style="font-size: 16px; font-weight: 900; color: #d90429;">${formattedTotal}</div>
                </div>
                <div style="text-align: right; font-size: 9px; font-style: italic;">
                    <div>Cho xem hàng & Không đồng kiểm</div>
                    <div>Chữ ký người nhận</div>
                </div>
            </div>

            <!-- Footer Warning -->
            <div style="text-align: center; font-size: 8px; color: #666; border-top: 1px dotted #888; padding-top: 4px;">
                Hàng hóa gửi qua hệ thống Jarvis AI Logistic Center. Mọi thắc mắc liên hệ bưu cục gần nhất.
            </div>
        </div>
    `;

    // Tự động chuyển trạng thái thành 'PRINTED'
    if (!order.order_status || order.order_status === 'PENDING') {
        await updateOrderStatusAction(order.id || trackingNum, 'PRINTED', false);
    }

    // Mở hộp thoại in trình duyệt
    window.print();
}

async function updateOrderStatusAction(orderIdOrKey, newStatus, showSuccessAlert = true) {
    try {
        const res = await fetch(`/api/inventory/post-office-orders/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                order_id: orderIdOrKey,
                status: newStatus
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Cập nhật trạng thái đơn thất bại.');
        }

        if (showSuccessAlert) {
            alert(`Đã cập nhật trạng thái đơn thành: ${newStatus}`);
        }
        await fetchAndRenderPostOfficeOrders();
    } catch (err) {
        console.error('[PostOffice] Update Status Error:', err);
        alert('⚠️ Lỗi: ' + err.message);
    }
}

// Hàm sinh SVG Barcode Code128 đơn giản độ tương phản cao
function generateBarcodeSvg(code) {
    const bars = [];
    const str = String(code).replace(/[^A-Za-z0-9]/g, '');
    let x = 10;
    
    // Start guard bars
    bars.push(`<rect x="${x}" y="0" width="3" height="40" fill="#000" />`); x += 5;
    bars.push(`<rect x="${x}" y="0" width="2" height="40" fill="#000" />`); x += 4;

    // Pattern for characters
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        const w1 = (charCode % 3) + 1;
        const w2 = ((charCode * 2) % 3) + 1;
        const w3 = ((charCode * 3) % 2) + 1;
        bars.push(`<rect x="${x}" y="0" width="${w1}" height="40" fill="#000" />`); x += w1 + 2;
        bars.push(`<rect x="${x}" y="0" width="${w2}" height="40" fill="#000" />`); x += w2 + 3;
        bars.push(`<rect x="${x}" y="0" width="${w3}" height="40" fill="#000" />`); x += w3 + 2;
    }

    // End guard bars
    bars.push(`<rect x="${x}" y="0" width="2" height="40" fill="#000" />`); x += 4;
    bars.push(`<rect x="${x}" y="0" width="3" height="40" fill="#000" />`); x += 5;

    return `
        <svg viewBox="0 0 ${x + 10} 40" style="width: 85%; max-width: 260px; height: 38px; margin: 0 auto; display: block;">
            ${bars.join('')}
        </svg>
    `;
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// Global exports
window.initPostOfficeModule = initPostOfficeModule;
window.openPostOfficeModal = openPostOfficeModal;
window.closePostOfficeModal = closePostOfficeModal;
window.fetchAndRenderPostOfficeOrders = fetchAndRenderPostOfficeOrders;
window.filterPostOfficeOrders = filterPostOfficeOrders;
window.printShippingLabel = printShippingLabel;
window.updateOrderStatusAction = updateOrderStatusAction;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPostOfficeModule);
} else {
    initPostOfficeModule();
}
