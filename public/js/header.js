function initHeaderModule() {
    let userRole = 'user';

    // 1. Display logged in user info & role tag
    try {
        const userInfoRaw = localStorage.getItem('user_info');
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            const email = (user.email || '').toLowerCase();
            const rawRole = String(user.role || '').toLowerCase();

            // Check if user is Admin ('1', 'admin', or email contains admin)
            const isAdminRole = rawRole === '1' || rawRole === 'admin' || email.includes('admin') || email.includes('boomhuy');
            userRole = isAdminRole ? 'admin' : 'user';
            const name = user.fullName || user.email || (isAdminRole ? 'AI Admin' : 'User');

            const userNameDisplay = document.getElementById('userNameDisplay');
            const userNameDisplayMobile = document.getElementById('userNameDisplayMobile');
            const userRoleTag = document.getElementById('userRoleTag');
            const userRoleTagMobile = document.getElementById('userRoleTagMobile');

            if (userNameDisplay) userNameDisplay.textContent = name;
            if (userNameDisplayMobile) userNameDisplayMobile.textContent = name;

            if (userRoleTag) {
                userRoleTag.textContent = isAdminRole ? 'ADMIN' : 'USER';
                if (!isAdminRole) {
                    userRoleTag.className = "text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30";
                }
            }
            if (userRoleTagMobile) {
                userRoleTagMobile.textContent = isAdminRole ? 'ADMIN' : 'USER';
                if (!isAdminRole) {
                    userRoleTagMobile.className = "text-[10px] text-cyan-400 font-mono bg-cyan-900/40 px-2 py-0.5 rounded border border-cyan-500/30";
                }
            }
        }
    } catch (e) {
        console.warn('[Header Module] Failed to parse user info:', e);
    }

    // 2. Apply Role-Based Access Control (RBAC) UI Controls
    const isAdmin = (userRole === 'admin');
    const btnManageUsers = document.getElementById('btnManageUsers');
    const btnManageUsersMobile = document.getElementById('btnManageUsersMobile');

    // Only hide User Management button for non-admins, keep Graph View active for all users
    if (!isAdmin) {
        if (btnManageUsers) btnManageUsers.style.display = 'none';
        if (btnManageUsersMobile) btnManageUsersMobile.style.display = 'none';
    }

    // 3. Mobile Menu Toggle Handler
    const btnMobileMenuToggle = document.getElementById('btnMobileMenuToggle');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    const mobileMenuIcon = document.getElementById('mobileMenuIcon');

    if (btnMobileMenuToggle && mobileNavMenu) {
        btnMobileMenuToggle.addEventListener('click', () => {
            const isHidden = mobileNavMenu.classList.contains('hidden');
            if (isHidden) {
                mobileNavMenu.classList.remove('hidden');
                if (mobileMenuIcon) mobileMenuIcon.textContent = 'close';
            } else {
                mobileNavMenu.classList.add('hidden');
                if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
            }
        });
    }

    // 4. Logout Action Handler
    function performLogout() {
        if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?')) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login';
        }
    }

    const btnLogout = document.getElementById('btnLogout');
    const btnMobileLogout = document.getElementById('btnMobileLogout');

    if (btnLogout) btnLogout.addEventListener('click', performLogout);
    if (btnMobileLogout) btnMobileLogout.addEventListener('click', performLogout);

    // 5. Synchronize Mobile Buttons with Core Functions
    const btnOpenDailyMobile = document.getElementById('btnOpenDailyMobile');
    const btnNewNoteMobile = document.getElementById('btnNewNoteMobile');

    if (btnOpenDailyMobile) {
        btnOpenDailyMobile.addEventListener('click', () => {
            if (typeof window.openDailyNoteModal === 'function') {
                window.openDailyNoteModal();
            } else {
                const desktopBtn = document.getElementById('btnOpenDaily');
                if (desktopBtn) desktopBtn.click();
            }
            if (mobileNavMenu) mobileNavMenu.classList.add('hidden');
            if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
        });
    }

    if (btnNewNoteMobile) {
        btnNewNoteMobile.addEventListener('click', () => {
            if (typeof window.openNewNoteModal === 'function') {
                window.openNewNoteModal();
            } else {
                const desktopBtn = document.getElementById('btnNewNote');
                if (desktopBtn) desktopBtn.click();
            }
            if (mobileNavMenu) mobileNavMenu.classList.add('hidden');
            if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
        });
    }

    // 6. Synchronize Mobile Search Input with Main Search Input
    const desktopSearchInput = document.getElementById('graphSearchInput');
    const mobileSearchInput = document.getElementById('graphSearchInputMobile');

    if (desktopSearchInput && mobileSearchInput) {
        mobileSearchInput.addEventListener('input', (e) => {
            desktopSearchInput.value = e.target.value;
            desktopSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }
}

// Export for global invocation
window.initHeaderModule = initHeaderModule;

// Auto-run if DOM already loaded or wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderModule);
} else {
    initHeaderModule();
}
