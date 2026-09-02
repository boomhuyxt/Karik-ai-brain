// Immediate Auth Guard Script - Blocks unauthenticated access and injects Auth Token into all API requests
(function setupAuthGuard() {
    try {
        const token = localStorage.getItem('auth_token');
        const isLoginPage = window.location.pathname === '/login' || window.location.pathname.endsWith('login.html');

        if (!token && !isLoginPage) {
            window.location.href = '/login';
            return;
        }
    } catch (e) {
        console.warn('[AuthGuard] Storage access error:', e);
    }

    // Global Fetch Interceptor: Automatically attach Bearer token to all /api requests
    if (typeof window !== 'undefined' && window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async function(resource, init = {}) {
            let url = typeof resource === 'string' ? resource : (resource ? resource.url || '' : '');
            const isApiRequest = url.startsWith('/api/') || url.includes('/api/');

            if (isApiRequest) {
                const token = localStorage.getItem('auth_token');
                const headers = new Headers(init.headers || (resource instanceof Request ? resource.headers : {}));

                if (token && !headers.has('Authorization')) {
                    headers.set('Authorization', `Bearer ${token}`);
                }

                init = {
                    ...init,
                    headers
                };
            }

            try {
                const response = await originalFetch(resource, init);

                // Handle global auth errors
                if (response.status === 401) {
                    const isAuthLogin = typeof url === 'string' && url.includes('/api/auth/login');
                    if (!isAuthLogin && !window.location.pathname.includes('/login')) {
                        console.warn('[AuthGuard] Phiên đăng nhập hết hạn hoặc chưa xác thực. Đang chuyển hướng...');
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('user_info');
                        window.location.href = '/login?expired=1';
                    }
                } else if (response.status === 403) {
                    console.warn('[AuthGuard] 403 Forbidden: Yêu cầu quyền Quản trị viên (Admin).');
                }

                return response;
            } catch (err) {
                throw err;
            }
        };
    }
})();

