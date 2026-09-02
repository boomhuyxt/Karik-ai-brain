// Auto redirect to / if already logged in when visiting login page
(function checkExistingSession() {
    try {
        const token = localStorage.getItem('auth_token');
        if (token) {
            window.location.href = '/';
        }
    } catch (e) {
        console.warn('[Auth] Error checking session:', e);
    }
})();

// ================= CLOUDFLARE TURNSTILE CONTROLLER =================
let turnstileConfig = {
    enabled: false,
    siteKey: '1x00000000000000000000AA'
};
const turnstileWidgets = {
    login: null,
    register: null,
    forgot: null
};

async function initTurnstile() {
    try {
        const res = await fetch('/api/auth/turnstile-config');
        if (res.ok) {
            turnstileConfig = await res.json();
        }
    } catch (e) {
        console.warn('[Turnstile] Could not fetch turnstile-config:', e);
    }

    if (!turnstileConfig.enabled) {
        return;
    }

    const checkAndRender = () => {
        if (typeof turnstile === 'undefined') {
            setTimeout(checkAndRender, 150);
            return;
        }

        const loginEl = document.getElementById('turnstile-login-container');
        if (loginEl && turnstileWidgets.login === null) {
            try {
                turnstileWidgets.login = turnstile.render('#turnstile-login-container', {
                    sitekey: turnstileConfig.siteKey,
                    theme: 'auto'
                });
            } catch (err) {
                console.warn('[Turnstile] Error rendering login widget:', err);
            }
        }

        const regEl = document.getElementById('turnstile-register-container');
        if (regEl && turnstileWidgets.register === null) {
            try {
                turnstileWidgets.register = turnstile.render('#turnstile-register-container', {
                    sitekey: turnstileConfig.siteKey,
                    theme: 'auto'
                });
            } catch (err) {
                console.warn('[Turnstile] Error rendering register widget:', err);
            }
        }
    };

    checkAndRender();
}

function renderForgotTurnstile() {
    if (!turnstileConfig.enabled) return;
    const checkAndRenderForgot = () => {
        if (typeof turnstile === 'undefined') {
            setTimeout(checkAndRenderForgot, 150);
            return;
        }
        const forgotEl = document.getElementById('turnstile-forgot-container');
        if (forgotEl && turnstileWidgets.forgot === null) {
            try {
                turnstileWidgets.forgot = turnstile.render('#turnstile-forgot-container', {
                    sitekey: turnstileConfig.siteKey,
                    theme: 'auto'
                });
            } catch (err) {
                console.warn('[Turnstile] Error rendering forgot widget:', err);
            }
        }
    };
    checkAndRenderForgot();
}

function getTurnstileToken(widgetId) {
    if (!turnstileConfig.enabled) return 'turnstile-disabled-bypass';
    if (typeof turnstile !== 'undefined' && widgetId !== null) {
        return turnstile.getResponse(widgetId) || '';
    }
    return '';
}

function resetTurnstile(widgetId) {
    if (!turnstileConfig.enabled) return;
    if (typeof turnstile !== 'undefined' && widgetId !== null) {
        try {
            turnstile.reset(widgetId);
        } catch (e) {
            console.warn('[Turnstile] Reset failed:', e);
        }
    }
}

function switchTab(tab) {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    hideToast();

    if (tab === 'login') {
        if (formLogin) formLogin.classList.remove('d-none');
        if (formRegister) formRegister.classList.add('d-none');
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
    } else {
        if (formLogin) formLogin.classList.add('d-none');
        if (formRegister) formRegister.classList.remove('d-none');
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        // Render register turnstile if not rendered yet
        if (turnstileConfig.enabled && turnstileWidgets.register === null) {
            initTurnstile();
        }
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn ? (btn.querySelector('.bi') || btn.querySelector('.material-symbols-outlined')) : null;
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            if (icon.classList.contains('bi')) {
                icon.classList.remove('bi-eye-fill');
                icon.classList.add('bi-eye-slash-fill');
            } else {
                icon.textContent = 'visibility_off';
            }
        }
    } else {
        input.type = 'password';
        if (icon) {
            if (icon.classList.contains('bi')) {
                icon.classList.remove('bi-eye-slash-fill');
                icon.classList.add('bi-eye-fill');
            } else {
                icon.textContent = 'visibility';
            }
        }
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-message');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.remove('d-none', 'alert-info', 'alert-danger', 'alert-success');

    if (isError) {
        toast.classList.add('alert-danger');
        if (toastIcon) {
            toastIcon.className = 'bi bi-exclamation-triangle-fill fs-5 me-1';
        }
    } else {
        toast.classList.add('alert-success');
        if (toastIcon) {
            toastIcon.className = 'bi bi-check-circle-fill fs-5 me-1';
        }
    }
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.classList.add('d-none');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    hideToast();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btnSubmit = document.getElementById('btn-login-submit');

    if (!email || !password) {
        showToast('Vui lòng điền đầy đủ email và mật khẩu.', true);
        return;
    }

    const turnstileToken = getTurnstileToken(turnstileWidgets.login);
    if (turnstileConfig.enabled && !turnstileToken) {
        showToast('Vui lòng hoàn tất xác thực Turnstile (Anti-Bot).', true);
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Đang xử lý...`;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                turnstileToken,
                'cf-turnstile-response': turnstileToken
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            resetTurnstile(turnstileWidgets.login);
            throw new Error(data.message || 'Đăng nhập thất bại.');
        }

        // Save token and user info
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));

        showToast('Đăng nhập thành công! Đang chuyển hướng...', false);

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);

    } catch (err) {
        resetTurnstile(turnstileWidgets.login);
        showToast(err.message || 'Lỗi kết nối máy chủ.', true);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>Đăng nhập</span><i class="bi bi-arrow-right fs-5"></i>`;
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    hideToast();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const btnSubmit = document.getElementById('btn-register-submit');

    if (password !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp.', true);
        return;
    }

    const turnstileToken = getTurnstileToken(turnstileWidgets.register);
    if (turnstileConfig.enabled && !turnstileToken) {
        showToast('Vui lòng hoàn tất xác thực Turnstile (Anti-Bot).', true);
        return;
    }

    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Đang tạo tài khoản...`;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName,
                email,
                password,
                confirmPassword,
                turnstileToken,
                'cf-turnstile-response': turnstileToken
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            resetTurnstile(turnstileWidgets.register);
            throw new Error(data.message || 'Đăng ký thất bại.');
        }

        // Save token and user info
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));

        showToast('Đăng ký thành công! Đang chuyển hướng...', false);

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);

    } catch (err) {
        resetTurnstile(turnstileWidgets.register);
        showToast(err.message || 'Lỗi kết nối máy chủ.', true);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<span>Tạo tài khoản</span><i class="bi bi-check-circle-fill fs-5"></i>`;
        }
    }
}

// FORGOT PASSWORD MODAL HANDLERS
function openForgotModal() {
    const modal = document.getElementById('forgotModal');
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const emailInput = document.getElementById('forgot-email');
    
    if (modal) {
        modal.classList.remove('d-none');
        if (step1) step1.classList.remove('d-none');
        if (step2) step2.classList.add('d-none');
        if (emailInput) {
            const loginEmail = document.getElementById('login-email');
            if (loginEmail && loginEmail.value) emailInput.value = loginEmail.value;
        }
    }
}

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.classList.add('d-none');
}

async function handleSendOtp() {
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const btnSend = document.getElementById('btnSendOtp');
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const devNotice = document.getElementById('devOtpNotice');
    const devValue = document.getElementById('devOtpValue');

    if (!email) {
        alert('Vui lòng nhập Email tài khoản.');
        return;
    }

    const turnstileToken = getTurnstileToken(turnstileWidgets.forgot);
    if (turnstileConfig.enabled && !turnstileToken) {
        alert('Vui lòng hoàn tất xác thực Turnstile (Anti-Bot) trước khi gửi OTP.');
        return;
    }

    if (btnSend) {
        btnSend.disabled = true;
        btnSend.textContent = 'Đang gửi mã OTP...';
    }

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                turnstileToken,
                'cf-turnstile-response': turnstileToken
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            resetTurnstile(turnstileWidgets.forgot);
            throw new Error(data.message || 'Không thể gửi mã OTP.');
        }

        alert(data.message || 'Đã gửi mã OTP xác nhận!');

        if (step1) step1.classList.add('d-none');
        if (step2) step2.classList.remove('d-none');

        if (data.devOtp) {
            if (devNotice) devNotice.classList.remove('d-none');
            if (devValue) devValue.textContent = data.devOtp;
        }

    } catch (err) {
        resetTurnstile(turnstileWidgets.forgot);
        alert(err.message || 'Lỗi gửi OTP.');
    } finally {
        if (btnSend) {
            btnSend.disabled = false;
            btnSend.textContent = 'Gửi mã OTP qua Gmail';
        }
    }
}

async function handleResetPasswordSubmit() {
    const emailInput = document.getElementById('forgot-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const otpInput = document.getElementById('reset-otp');
    const otp = otpInput ? otpInput.value.trim() : '';
    const passwordInput = document.getElementById('reset-password');
    const newPassword = passwordInput ? passwordInput.value : '';
    const btnReset = document.getElementById('btnResetPassword');

    if (!email || !otp || !newPassword) {
        alert('Vui lòng nhập đầy đủ Mã OTP và Mật khẩu mới.');
        return;
    }

    if (btnReset) {
        btnReset.disabled = true;
        btnReset.textContent = 'Đang cập nhật mật khẩu...';
    }

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.message || 'Đặt lại mật khẩu thất bại.');
        }

        alert(data.message || 'Đặt lại mật khẩu thành công!');
        closeForgotModal();

        // Switch to login tab and populate password
        switchTab('login');
        const loginPassword = document.getElementById('login-password');
        if (loginPassword) loginPassword.value = newPassword;

    } catch (err) {
        alert(err.message || 'Lỗi đặt lại mật khẩu.');
    } finally {
        if (btnReset) {
            btnReset.disabled = false;
            btnReset.textContent = 'Xác nhận đặt lại mật khẩu';
        }
    }
}

