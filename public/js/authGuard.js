// Immediate Auth Guard Script - Blocks unauthenticated access instantly
(function checkAuthGuard() {
    try {
        const token = localStorage.getItem('auth_token');
        const isLoginPage = window.location.pathname === '/login' || window.location.pathname.endsWith('login.html');
        
        if (!token && !isLoginPage) {
            window.location.href = '/login';
        }
    } catch (e) {
        console.warn('[AuthGuard] Storage access error:', e);
    }
})();
