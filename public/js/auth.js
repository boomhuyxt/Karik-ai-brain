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

function switchTab(tab) {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    hideToast();

    if (tab === 'login') {
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        tabLogin.classList.add('active');
        tabLogin.classList.remove('text-gray-400');
        tabRegister.classList.remove('active');
        tabRegister.classList.add('text-gray-400');
    } else {
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
        tabRegister.classList.add('active');
        tabRegister.classList.remove('text-gray-400');
        tabLogin.classList.remove('active');
        tabLogin.classList.add('text-gray-400');
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('.material-symbols-outlined');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-message');

    toastMsg.textContent = message;
    toast.classList.remove('hidden', 'bg-red-900/50', 'border-red-700', 'text-red-200', 'bg-emerald-900/50', 'border-emerald-700', 'text-emerald-200');

    if (isError) {
        toast.classList.add('bg-red-900/50', 'border', 'border-red-700', 'text-red-200');
        toastIcon.textContent = 'error';
    } else {
        toast.classList.add('bg-emerald-900/50', 'border', 'border-emerald-700', 'text-emerald-200');
        toastIcon.textContent = 'check_circle';
    }
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('hidden');
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

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang xử lý...`;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
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
        showToast(err.message || 'Lỗi kết nối máy chủ.', true);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Đăng nhập</span><span class="material-symbols-outlined text-lg">arrow_forward</span>`;
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

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Đang tạo tài khoản...`;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, email, password, confirmPassword })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
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
        showToast(err.message || 'Lỗi kết nối máy chủ.', true);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Tạo tài khoản</span><span class="material-symbols-outlined text-lg">check_circle</span>`;
    }
}

// FORGOT PASSWORD MODAL HANDLERS
function openForgotModal() {
    const modal = document.getElementById('forgotModal');
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const emailInput = document.getElementById('forgot-email');
    
    if (modal) {
        modal.classList.remove('hidden');
        if (step1) step1.classList.remove('hidden');
        if (step2) step2.classList.add('hidden');
        if (emailInput) {
            const loginEmail = document.getElementById('login-email');
            if (loginEmail && loginEmail.value) emailInput.value = loginEmail.value;
        }
    }
}

function closeForgotModal() {
    const modal = document.getElementById('forgotModal');
    if (modal) modal.classList.add('hidden');
}

async function handleSendOtp() {
    const email = document.getElementById('forgot-email').value.trim();
    const btnSend = document.getElementById('btnSendOtp');
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotStep2');
    const devNotice = document.getElementById('devOtpNotice');
    const devValue = document.getElementById('devOtpValue');

    if (!email) {
        alert('Vui lòng nhập Email tài khoản.');
        return;
    }

    btnSend.disabled = true;
    btnSend.textContent = 'Đang gửi mã OTP...';

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.message || 'Không thể gửi mã OTP.');
        }

        alert(data.message || 'Đã gửi mã OTP xác nhận!');

        if (step1) step1.classList.add('hidden');
        if (step2) step2.classList.remove('hidden');

        if (data.devOtp) {
            if (devNotice) devNotice.classList.remove('hidden');
            if (devValue) devValue.textContent = data.devOtp;
        }

    } catch (err) {
        alert(err.message || 'Lỗi gửi OTP.');
    } finally {
        btnSend.disabled = false;
        btnSend.textContent = 'Gửi mã OTP qua Gmail';
    }
}

async function handleResetPasswordSubmit() {
    const email = document.getElementById('forgot-email').value.trim();
    const otp = document.getElementById('reset-otp').value.trim();
    const newPassword = document.getElementById('reset-password').value;
    const btnReset = document.getElementById('btnResetPassword');

    if (!email || !otp || !newPassword) {
        alert('Vui lòng nhập đầy đủ Mã OTP và Mật khẩu mới.');
        return;
    }

    btnReset.disabled = true;
    btnReset.textContent = 'Đang cập nhật mật khẩu...';

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
        btnReset.disabled = false;
        btnReset.textContent = 'Xác nhận đặt lại mật khẩu';
    }
}
