/**
 * Maroa PMS - Audit Logs Viewer
 * PT. MAROA TUNGGA ABADI
 */

const AuditModule = {
    currentList: [],

    async load() {
        const container = document.getElementById('view-audit');
        if (!container) return;
        await this.fetchLogs();
    },

    async fetchLogs() {
        const tbody = document.getElementById('table-audit-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat catatan audit sistem...</td></tr>';

        try {
            const params = {};
            const module = document.getElementById('filter-audit-module')?.value;
            const action = document.getElementById('filter-audit-action')?.value;
            const search = document.getElementById('search-audit-input')?.value;

            if (module) params.module = module;
            if (action) params.action = action;
            if (search) params.search = search;

            const res = await API.get('/audit-logs/', params);
            this.currentList = res.results || res || [];
            this.renderTable(this.currentList);
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-red-500">Gagal memuat audit log: ${e.message}</td></tr>`;
        }
    },

    renderTable(list) {
        const tbody = document.getElementById('table-audit-body');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="py-12 text-center text-slate-400">Belum ada riwayat audit log.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(a => {
            let actionBadge = 'bg-slate-100 text-slate-700';
            if (a.action === 'CREATE') actionBadge = 'bg-emerald-100 text-emerald-800';
            if (a.action === 'UPDATE') actionBadge = 'bg-blue-100 text-blue-800';
            if (a.action === 'DELETE') actionBadge = 'bg-red-100 text-red-800';
            if (a.action === 'CONVERT') actionBadge = 'bg-teal-100 text-teal-800';
            if (a.action === 'EXPORT_PDF') actionBadge = 'bg-rose-100 text-rose-800';
            if (a.action === 'LOGIN') actionBadge = 'bg-purple-100 text-purple-800';

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-xs">
                    <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${a.timestamp_formatted}</td>
                    <td class="py-3 px-4 font-bold text-slate-900">${a.user_name || 'System'}</td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded font-bold text-[10px] ${actionBadge}">
                            ${a.action}
                        </span>
                    </td>
                    <td class="py-3 px-4 font-semibold text-slate-700 font-mono-code">${a.module}</td>
                    <td class="py-3 px-4 font-medium text-slate-900">${a.object_repr}</td>
                    <td class="py-3 px-4 font-mono-code text-slate-400 text-right">${a.ip_address || '127.0.0.1'}</td>
                </tr>
            `;
        }).join('');
    }
};

window.AuditModule = AuditModule;
