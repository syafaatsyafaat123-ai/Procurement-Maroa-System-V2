/**
 * Maroa PMS - Authentication & RBAC Access Control
 * PT. MAROA TUNGGA ABADI
 */

const Auth = {
    currentUser: null,

    async init() {
        const token = API.getToken();
        if (token) {
            try {
                const user = await API.get('/auth/me/');
                this.setCurrentUser(user);
                this.updateUI();
                this.hideLoginModal();
                return true;
            } catch (err) {
                console.warn('Session verification failed:', err);
                this.showLoginModal();
                return false;
            }
        } else {
            this.showLoginModal();
            return false;
        }
    },

    setCurrentUser(user) {
        this.currentUser = user;
        API.setCurrentUser(user);
    },

    getUser() {
        return this.currentUser || API.getCurrentUser();
    },

    isAdmin() {
        const user = this.getUser();
        return user && (user.role === 'ADMIN' || user.is_superuser);
    },

    canProcure() {
        const user = this.getUser();
        return user && (user.role === 'ADMIN' || user.role === 'PROCUREMENT');
    },

    isReadOnly() {
        const user = this.getUser();
        return user && user.role === 'VIEWER';
    },

    showLoginModal(msg = '') {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.classList.add('overflow-hidden');
            const alertEl = document.getElementById('login-alert-msg');
            if (alertEl) {
                if (msg) {
                    alertEl.textContent = msg;
                    alertEl.classList.remove('hidden');
                } else {
                    alertEl.classList.add('hidden');
                }
            }
        }
    },

    hideLoginModal() {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.classList.remove('overflow-hidden');
        }
    },

    fillDemoAccount(username, password = '1114ROA') {
        const uInput = document.getElementById('login-username');
        const pInput = document.getElementById('login-password');
        if (uInput && pInput) {
            uInput.value = username;
            pInput.value = password;
            uInput.focus();
            showToast(`Kredensial akun '${username}' dimasukkan`, 'info', 1500);
        }
    },

    async handleLogin(event) {
        if (event) event.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('login-remember').checked;
        const btn = document.getElementById('btn-login-submit');

        if (!username || !password) {
            showToast('Harap masukkan username dan password.', 'warning');
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengautentikasi...';
            }

            const response = await API.post('/auth/login/', {
                username,
                password,
                remember_me: rememberMe
            });

            API.setToken(response.token, rememberMe);
            this.setCurrentUser(response.user);
            this.updateUI();
            this.hideLoginModal();
            showToast(`Selamat datang, ${response.user.full_name || response.user.username}!`, 'success');

            // Refresh current view
            if (window.App && typeof window.App.refreshCurrentView === 'function') {
                window.App.refreshCurrentView();
            }
        } catch (error) {
            showToast(error.message || 'Gagal login ke sistem.', 'error');
            const alertEl = document.getElementById('login-alert-msg');
            if (alertEl) {
                alertEl.textContent = error.message;
                alertEl.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i> Masuk ke Sistem';
            }
        }
    },

    async handleLogout() {
        if (confirm('Apakah Anda yakin ingin keluar dari Maroa PMS?')) {
            try {
                await API.post('/auth/logout/');
            } catch (e) {
                console.warn('Logout API error:', e);
            }
            API.removeToken();
            this.currentUser = null;
            showToast('Anda telah keluar dari sistem.', 'info');
            this.showLoginModal();
            this.updateUI();
        }
    },

    togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input && icon) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    },

    updateUI() {
        const user = this.getUser();
        const userDisplay = document.getElementById('topbar-user-name');
        const roleBadge = document.getElementById('topbar-role-badge');
        const deptDisplay = document.getElementById('topbar-dept');
        const userAvatar = document.getElementById('topbar-avatar-initials');

        if (user) {
            const name = user.full_name || user.first_name || user.username;
            if (userDisplay) userDisplay.textContent = name;
            if (deptDisplay) deptDisplay.textContent = user.department || 'PT. MAROA TUNGGA ABADI';
            
            if (userAvatar) {
                const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                userAvatar.textContent = initials || 'M';
            }

            if (roleBadge) {
                const jabatanText = user.jabatan || (user.role === 'ADMIN' ? 'Direktur' : user.role === 'PROCUREMENT' ? 'Operational Manager' : 'Staff Procurement');
                roleBadge.textContent = jabatanText;
                roleBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md ';
                if (user.role === 'ADMIN' || jabatanText === 'Direktur') {
                    roleBadge.className += 'bg-blue-100 text-blue-900 border border-blue-200';
                } else if (jabatanText === 'Operational Manager' || user.role === 'PROCUREMENT') {
                    roleBadge.className += 'bg-indigo-100 text-indigo-900 border border-indigo-200';
                } else {
                    roleBadge.className += 'bg-teal-100 text-teal-900 border border-teal-200';
                }
            }

            // Show/Hide RBAC sensitive buttons
            document.querySelectorAll('[data-role-perm="admin"]').forEach(el => {
                el.style.display = this.isAdmin() ? '' : 'none';
            });
            document.querySelectorAll('[data-role-perm="procure"]').forEach(el => {
                el.style.display = this.canProcure() ? '' : 'none';
            });
        }
    }
};

window.Auth = Auth;
