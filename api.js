/**
 * Maroa PMS - API Client & Common Utilities
 * PT. MAROA TUNGGA ABADI
 */

const API = {
    baseUrl: '/api',

    getToken() {
        return localStorage.getItem('maroa_auth_token') || sessionStorage.getItem('maroa_auth_token') || '';
    },

    setToken(token, remember = false) {
        if (remember) {
            localStorage.setItem('maroa_auth_token', token);
        } else {
            sessionStorage.setItem('maroa_auth_token', token);
        }
    },

    removeToken() {
        localStorage.removeItem('maroa_auth_token');
        sessionStorage.removeItem('maroa_auth_token');
        localStorage.removeItem('maroa_current_user');
        sessionStorage.removeItem('maroa_current_user');
    },

    getCurrentUser() {
        const u = localStorage.getItem('maroa_current_user') || sessionStorage.getItem('maroa_current_user');
        return u ? JSON.parse(u) : null;
    },

    setCurrentUser(user, remember = false) {
        const uStr = JSON.stringify(user);
        if (remember) {
            localStorage.setItem('maroa_current_user', uStr);
        } else {
            sessionStorage.setItem('maroa_current_user', uStr);
        }
    },

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    },

    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') || endpoint.startsWith('/api') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Token ${token}`;
        }

        const csrfToken = this.getCookie('csrftoken');
        if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) {
            headers['X-CSRFToken'] = csrfToken;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // If unauthorized and not on login page, prompt re-login
                this.removeToken();
                if (window.Auth && typeof window.Auth.showLoginModal === 'function') {
                    window.Auth.showLoginModal('Sesi login telah berakhir. Silakan login kembali.');
                }
                throw new Error('Sesi telah berakhir.');
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                const data = await response.json();
                if (!response.ok) {
                    const errorMsg = data.detail || (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Terjadi kesalahan sistem.');
                    throw new Error(errorMsg);
                }
                return data;
            } else if (contentType.includes('application/pdf')) {
                return await response.blob();
            } else {
                const text = await response.text();
                if (!response.ok) {
                    throw new Error(text || 'Terjadi kesalahan pada server.');
                }
                return text;
            }
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return this.request(url, { method: 'GET' });
    },

    post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

/**
 * Currency and Number Formatting in Indonesian Rupiah
 */
function formatRupiah(amount) {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return 'Rp 0';
    const num = Math.round(Number(amount));
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseRupiah(str) {
    if (!str) return 0;
    const cleanStr = String(str).replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-in transition-all duration-300`;

    let bgBorder = 'bg-white border-slate-200 text-slate-800';
    let icon = '<i class="fa-solid fa-circle-info text-blue-600 text-lg"></i>';

    if (type === 'success') {
        bgBorder = 'bg-emerald-50 border-emerald-200 text-emerald-900';
        icon = '<i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>';
    } else if (type === 'error') {
        bgBorder = 'bg-red-50 border-red-200 text-red-900';
        icon = '<i class="fa-solid fa-circle-exclamation text-red-600 text-lg"></i>';
    } else if (type === 'warning') {
        bgBorder = 'bg-amber-50 border-amber-200 text-amber-900';
        icon = '<i class="fa-solid fa-triangle-exclamation text-amber-600 text-lg"></i>';
    }

    toast.className += ` ${bgBorder}`;
    toast.innerHTML = `
        ${icon}
        <div class="flex-1">${message}</div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Modal Dialog Helpers
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.classList.add('overflow-hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
    }
}

// Global modal close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(modal => {
            if (modal.id !== 'login-modal') {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
        document.body.classList.remove('overflow-hidden');
    }
});
