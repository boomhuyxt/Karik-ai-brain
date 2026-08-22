function initHeaderModule() {
    let userRole = 'user';

    // 1. Parse logged in user info & role
    try {
        const userInfoRaw = localStorage.getItem('user_info');
        if (userInfoRaw) {
            const user = JSON.parse(userInfoRaw);
            const email = (user.email || '').toLowerCase();
            const rawRole = String(user.role || '').toLowerCase();

            // Check if user is Admin ('1', 'admin', or root admin accounts)
            const isAdminRole = rawRole === '1' || rawRole === 'admin' || email === 'adminai' || email === 'admin@ai-brain.local';
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

    // 2. Apply Role-Based Access Control (RBAC) UI Separation
    const isAdmin = (userRole === 'admin');
    const isGraphviewPage = window.location.pathname.includes('graphview');

    const adminHeaderActions = document.getElementById('adminHeaderActions');
    const adminMobileActions = document.getElementById('adminMobileActions');
    const btnRefreshGraphMobile = document.getElementById('btnRefreshGraphMobile');

    if (!isAdmin) {
        // Hide Admin-only controls
        if (adminHeaderActions) adminHeaderActions.style.display = 'none';
        if (adminMobileActions) adminMobileActions.style.display = 'none';
        if (btnRefreshGraphMobile) btnRefreshGraphMobile.style.display = 'none';

        // If on the main dashboard (/ or /index.html), apply dedicated User AI Assistant UI
        if (!isGraphviewPage) {
            applyUserAssistantLayout();
        }
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

// Function to transform User Workspace into a Dedicated AI Assistant Workspace (Gemini/ChatGPT style)
function applyUserAssistantLayout(retryCount = 0) {
    const graphSvg = document.getElementById('graphSvg');
    const controlsGraphBox = document.getElementById('controlsGraphBox');
    const legendBox = document.getElementById('legendBox');
    const obsidianGraphSettingsPanel = document.getElementById('obsidianGraphSettingsPanel');
    const obsidianStatusBar = document.getElementById('obsidianStatusBar');
    const graphContainer = document.getElementById('graphContainer');
    const chatContainer = document.getElementById('chatContainer');
    const chatBoxContainer = document.getElementById('chatBoxContainer');

    if (graphSvg) graphSvg.style.display = 'none';
    if (controlsGraphBox) controlsGraphBox.style.display = 'none';
    if (legendBox) legendBox.style.display = 'none';
    if (obsidianGraphSettingsPanel) obsidianGraphSettingsPanel.style.display = 'none';
    if (obsidianStatusBar) obsidianStatusBar.style.display = 'none';

    if (graphContainer) {
        graphContainer.className = "flex-1 h-full w-full relative overflow-hidden flex items-center justify-center p-2 md:p-6 bg-stars";
    }

    if (chatContainer) {
        chatContainer.className = "w-full h-full flex items-center justify-center p-2 md:p-4 z-20 pointer-events-auto";
    }

    if (chatBoxContainer) {
        // Expand Chatbox UI to fill entire viewport area for regular users
        chatBoxContainer.classList.add('user-fullscreen-chat');
        
        // Hide minimize chat button in user standalone mode
        const btnMinimizeChat = document.getElementById('btnMinimizeChat');
        if (btnMinimizeChat) btnMinimizeChat.style.display = 'none';

        // Expand chat messages area
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.className = "flex-1 w-full overflow-y-auto pr-2 my-3 space-y-4 text-sm md:text-base font-sans min-h-0 leading-relaxed";
        }
    } else if (retryCount < 15) {
        // Retry if async component loading hasn't finished yet
        setTimeout(() => applyUserAssistantLayout(retryCount + 1), 100);
    }
}

// Export for global invocation
window.initHeaderModule = initHeaderModule;
window.applyUserAssistantLayout = applyUserAssistantLayout;

// Auto-run if DOM already loaded or wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderModule);
} else {
    initHeaderModule();
}
