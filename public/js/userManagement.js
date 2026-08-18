/**
 * User Management & Statistics Module for Admin Dashboard
 */
let cachedUsersList = [];

function initUserManagementModule() {
    const btnManageUsers = document.getElementById('btnManageUsers');
    const btnManageUsersMobile = document.getElementById('btnManageUsersMobile');
    const btnCloseUserModal = document.getElementById('btnCloseUserModal');
    const userSearchInput = document.getElementById('userSearchInput');

    if (btnManageUsers) {
        btnManageUsers.addEventListener('click', openUserManagementModal);
    }
    if (btnManageUsersMobile) {
        btnManageUsersMobile.addEventListener('click', () => {
            openUserManagementModal();
            const mobileNavMenu = document.getElementById('mobileNavMenu');
            const mobileMenuIcon = document.getElementById('mobileMenuIcon');
            if (mobileNavMenu) mobileNavMenu.classList.add('hidden');
            if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
        });
    }

    if (btnCloseUserModal) {
        btnCloseUserModal.addEventListener('click', closeUserManagementModal);
    }

    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderUserTable(cachedUsersList);
                return;
            }
            const filtered = cachedUsersList.filter(u => 
                (u.email || '').toLowerCase().includes(query) || 
                (u.fullName || '').toLowerCase().includes(query)
            );
            renderUserTable(filtered);
        });
    }
}

async function openUserManagementModal() {
    const modal = document.getElementById('userManagementModal');
    if (modal) {
        modal.classList.remove('hidden');
        await fetchUserListData();
    }
}

function closeUserManagementModal() {
    const modal = document.getElementById('userManagementModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function fetchUserListData() {
    const userTableBody = document.getElementById('userTableBody');
    const statTotalUsers = document.getElementById('statTotalUsers');
    const statActiveUsers = document.getElementById('statActiveUsers');
    const statBlockedUsers = document.getElementById('statBlockedUsers');

    const token = localStorage.getItem('auth_token');
    const userInfoRaw = localStorage.getItem('user_info');
    let userRole = '1';
    let userEmail = 'adminai';

    if (userInfoRaw) {
        try {
            const u = JSON.parse(userInfoRaw);
            if (u.role) userRole = u.role;
            if (u.email) userEmail = u.email;
        } catch (e) { }
    }

    const headers = {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-User-Role': userRole,
        'X-User-Email': userEmail,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const res = await fetch(`/api/admin/users?t=${Date.now()}`, { cache: 'no-store', headers });
        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Máy chủ trả về phản hồi không phải JSON (Mã HTTP: ${res.status}).`);
        }

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Không thể tải danh sách người dùng.');
        }

        // Update Statistics Counters
        if (statTotalUsers) statTotalUsers.textContent = data.stats?.totalUsers || 0;
        if (statActiveUsers) statActiveUsers.textContent = data.stats?.activeUsers || 0;
        if (statBlockedUsers) statBlockedUsers.textContent = data.stats?.blockedUsers || 0;

        cachedUsersList = data.users || [];
        renderUserTable(cachedUsersList);

    } catch (err) {
        console.error('[UserManagement] Fetch Error:', err);
        if (userTableBody) {
            userTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-6 text-center text-red-400 font-mono">
                        ⚠️ Lỗi: ${err.message}
                    </td>
                </tr>
            `;
        }
    }
}

function renderUserTable(users) {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody) return;

    if (!users || users.length === 0) {
        userTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-slate-400 font-mono">
                    Không tìm thấy người dùng nào phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    userTableBody.innerHTML = users.map(user => {
        const emailLower = (user.email || '').toLowerCase();
        const isRootAdmin = emailLower === 'adminai' || emailLower === 'admin@ai-brain.local' || user.id === 'usr_adminAI' || user.id === 'usr_admin';
        const isUserAdmin = user.role === '1' || user.role === 'admin' || emailLower.includes('admin');
        const isBlocked = user.status === 'blocked';
        const formattedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '---';

        const roleBadge = isUserAdmin
            ? `<span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 font-bold">ADMIN</span>`
            : `<span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">USER</span>`;

        const statusBadge = isBlocked
            ? `<span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 flex items-center gap-1 w-max"><span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> ĐÃ KHÓA</span>`
            : `<span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 w-max"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> HOẠT ĐỘNG</span>`;

        let roleBtn = '';
        let statusBtn = '';

        if (isRootAdmin) {
            roleBtn = `<span class="text-[10px] text-purple-400/70 font-mono italic px-1.5">Admin Gốc</span>`;
            statusBtn = `<span class="text-[10px] text-slate-500 font-mono italic">Bảo vệ</span>`;
        } else {
            // Nút thay đổi quyền User / Admin
            if (isUserAdmin) {
                roleBtn = `
                    <button type="button" onclick="changeUserRoleAction('${user.id}', '0', '${escapeHtml(user.email)}')" title="Hạ quyền xuống User thông thường"
                        class="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/40 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm">
                        <span class="material-symbols-outlined text-sm">person</span>
                        <span class="hidden xs:inline">Hạ User</span>
                    </button>
                `;
            } else {
                roleBtn = `
                    <button type="button" onclick="changeUserRoleAction('${user.id}', '1', '${escapeHtml(user.email)}')" title="Nâng lên quyền Quản trị viên (Admin)"
                        class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm">
                        <span class="material-symbols-outlined text-sm">admin_panel_settings</span>
                        <span class="hidden xs:inline">Nâng Admin</span>
                    </button>
                `;
            }

            // Nút Khóa / Mở khóa tài khoản
            if (isBlocked) {
                statusBtn = `
                    <button type="button" onclick="toggleUserStatusAction('${user.id}', 'active')" title="Mở khóa tài khoản"
                        class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm">
                        <span class="material-symbols-outlined text-sm">lock_open</span>
                        <span class="hidden xs:inline">Mở khóa</span>
                    </button>
                `;
            } else {
                statusBtn = `
                    <button type="button" onclick="toggleUserStatusAction('${user.id}', 'blocked')" title="Khóa tài khoản"
                        class="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm">
                        <span class="material-symbols-outlined text-sm">block</span>
                        <span class="hidden xs:inline">Khóa</span>
                    </button>
                `;
            }
        }

        return `
            <tr class="hover:bg-purple-900/10 transition-colors">
                <td class="py-2 px-2.5 sm:px-3">
                    <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <span class="material-symbols-outlined ${isUserAdmin ? 'text-purple-400' : 'text-cyan-400'} text-lg sm:text-xl flex-shrink-0">account_circle</span>
                        <div class="min-w-0">
                            <span class="font-medium text-white text-xs block truncate">${escapeHtml(user.fullName || 'User')}</span>
                            <span class="text-[10px] text-slate-400 font-mono block truncate">${escapeHtml(user.email)}</span>
                        </div>
                    </div>
                </td>
                <td class="py-2 px-2 sm:px-3">${roleBadge}</td>
                <td class="py-2 px-2 sm:px-3">${statusBadge}</td>
                <td class="py-2 px-2 sm:px-3 hidden sm:table-cell font-mono text-[11px] text-slate-400">${formattedDate}</td>
                <td class="py-2 px-2.5 sm:px-3 text-right">
                    <div class="flex items-center gap-1.5 justify-end flex-wrap">
                        ${roleBtn}
                        ${statusBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function changeUserRoleAction(userId, targetRole, email) {
    const isTargetAdmin = String(targetRole) === '1' || targetRole === 'admin';
    const actionText = isTargetAdmin 
        ? `NÂNG LÊN QUYỀN QUẢN TRỊ VIÊN (ADMIN)` 
        : `HẠ XUỐNG QUYỀN NGƯỜI DÙNG (USER)`;
        
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} cho tài khoản "${email}" không?`)) {
        return;
    }

    const token = localStorage.getItem('auth_token');
    const userInfoRaw = localStorage.getItem('user_info');
    let userRole = '1';
    let userEmail = 'adminai';

    if (userInfoRaw) {
        try {
            const u = JSON.parse(userInfoRaw);
            if (u.role) userRole = u.role;
            if (u.email) userEmail = u.email;
        } catch (e) { }
    }

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Role': userRole,
        'X-User-Email': userEmail,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ role: isTargetAdmin ? '1' : '0' })
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Máy chủ phản hồi không đúng định dạng (Mã HTTP: ${res.status}).`);
        }

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Thay đổi quyền người dùng thất bại.');
        }

        await fetchUserListData();
    } catch (err) {
        alert('⚠️ Lỗi: ' + err.message);
    }
}

async function toggleUserStatusAction(userId, targetStatus) {
    const actionText = targetStatus === 'blocked' ? 'khóa' : 'mở khóa';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản này không?`)) {
        return;
    }

    const token = localStorage.getItem('auth_token');
    const userInfoRaw = localStorage.getItem('user_info');
    let userRole = '1';
    let userEmail = 'adminai';

    if (userInfoRaw) {
        try {
            const u = JSON.parse(userInfoRaw);
            if (u.role) userRole = u.role;
            if (u.email) userEmail = u.email;
        } catch (e) { }
    }

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Role': userRole,
        'X-User-Email': userEmail,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: targetStatus })
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Máy chủ trả về phản hồi không phải JSON (Mã HTTP: ${res.status}).`);
        }

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Cập nhật trạng thái thất bại.');
        }

        await fetchUserListData();
    } catch (err) {
        alert('⚠️ Lỗi: ' + err.message);
    }
}

async function deleteUserAction(userId, email) {
    if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN tài khoản "${email}" không?`)) {
        return;
    }

    const token = localStorage.getItem('auth_token');
    const userInfoRaw = localStorage.getItem('user_info');
    let userRole = '1';
    let userEmail = 'adminai';

    if (userInfoRaw) {
        try {
            const u = JSON.parse(userInfoRaw);
            if (u.role) userRole = u.role;
            if (u.email) userEmail = u.email;
        } catch (e) { }
    }

    const headers = {
        'Accept': 'application/json',
        'X-User-Role': userRole,
        'X-User-Email': userEmail,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Xóa tài khoản thất bại.');
        }

        await fetchUserListData();
    } catch (err) {
        alert('⚠️ Lỗi: ' + err.message);
    }
}

async function cleanTestUsersAction() {
    if (!confirm('Bạn có chắc chắn muốn DỌN DẸP TOÀN BỘ các tài khoản Test (email dạng test_... hoặc @example.com) không?')) {
        return;
    }

    const token = localStorage.getItem('auth_token');
    const userInfoRaw = localStorage.getItem('user_info');
    let userRole = '1';
    let userEmail = 'adminai';

    if (userInfoRaw) {
        try {
            const u = JSON.parse(userInfoRaw);
            if (u.role) userRole = u.role;
            if (u.email) userEmail = u.email;
        } catch (e) { }
    }

    const headers = {
        'Accept': 'application/json',
        'X-User-Role': userRole,
        'X-User-Email': userEmail,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
        const res = await fetch('/api/admin/users/test-users', {
            method: 'DELETE',
            headers
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Dọn dẹp tài khoản test thất bại.');
        }

        alert(data.message || 'Đã dọn dẹp tài khoản test thành công!');
        await fetchUserListData();
    } catch (err) {
        alert('⚠️ Lỗi: ' + err.message);
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

// Export for global invocation
window.initUserManagementModule = initUserManagementModule;
window.openUserManagementModal = openUserManagementModal;
window.closeUserManagementModal = closeUserManagementModal;
window.toggleUserStatusAction = toggleUserStatusAction;
window.changeUserRoleAction = changeUserRoleAction;
window.deleteUserAction = deleteUserAction;
window.cleanTestUsersAction = cleanTestUsersAction;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserManagementModule);
} else {
    initUserManagementModule();
}
