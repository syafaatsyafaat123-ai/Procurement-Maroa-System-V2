/**
 * Maroa PMS - BAST (Berita Acara Serah Terima) Module
 * PT. MAROA TUNGGA ABADI
 */

const BASTModule = {
    currentList: [],

    async load() {
        const container = document.getElementById('view-bast');
        if (!container) return;
        await this.fetchBASTs();
    },

    async fetchBASTs(statusFilter = '') {
        const tbody = document.getElementById('table-bast-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat BAST...</td></tr>';

        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const searchVal = document.getElementById('search-bast-input')?.value;
            if (searchVal) params.search = searchVal;

            const res = await API.get('/bast/', params);
            this.currentList = res.results || res || [];
            this.renderTable(this.currentList);
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Gagal memuat BAST: ${error.message}</td></tr>`;
        }
    },

    renderTable(list) {
        const tbody = document.getElementById('table-bast-body');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada Berita Acara Serah Terima (BAST).</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(b => {
            const badgeClass = b.status === 'SIGNED' || b.status === 'COMPLETED' ? 'badge-signed' : 'badge-draft';
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                    <td class="py-3 px-4 font-bold text-amber-800 font-mono-code">${b.bast_number}</td>
                    <td class="py-3 px-4 text-slate-600">${b.bast_date}</td>
                    <td class="py-3 px-4 font-semibold text-slate-900">${b.customer_name}</td>
                    <td class="py-3 px-4 text-xs font-mono-code text-teal-800">${b.po_number}</td>
                    <td class="py-3 px-4 text-xs text-slate-600">${b.delivery_order_number || '-'}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                            ${b.status_display}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="BASTModule.viewDetails(${b.id})" title="Lihat Detail BAST" class="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="BASTModule.downloadPDF(${b.id})" title="Download Dokumen Resmi BAST" class="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <i class="fa-solid fa-file-pdf"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async viewDetails(id) {
        try {
            const b = await API.get(`/bast/${id}/`);
            document.getElementById('view-bast-number').textContent = b.bast_number;
            document.getElementById('view-bast-customer').textContent = b.customer_name;
            document.getElementById('view-bast-date').textContent = b.bast_date;
            document.getElementById('view-bast-po').textContent = b.po_number;
            document.getElementById('view-bast-do').textContent = b.delivery_order_number || '-';
            document.getElementById('view-bast-project').textContent = b.project_name || '-';
            document.getElementById('view-bast-handover').textContent = b.handover_by;
            document.getElementById('view-bast-received').textContent = b.received_by;
            document.getElementById('view-bast-inspector').textContent = b.inspector_name || 'Tim QC / Lapangan';
            document.getElementById('view-bast-notes').textContent = b.notes || '-';

            const tbody = document.getElementById('view-bast-items');
            tbody.innerHTML = (b.items || []).map((item, idx) => `
                <tr class="border-b border-slate-100 text-xs">
                    <td class="p-2 text-center text-slate-400 font-mono-code">${idx + 1}</td>
                    <td class="p-2 font-mono-code font-bold text-amber-900">${item.part_number || '-'}</td>
                    <td class="p-2 text-slate-700">${item.description}</td>
                    <td class="p-2 text-center">${item.ordered_quantity}</td>
                    <td class="p-2 text-center font-bold text-emerald-700">${item.received_quantity}</td>
                    <td class="p-2 text-center">${item.uom}</td>
                    <td class="p-2 text-center">
                        <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${item.condition_status === 'GOOD' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                            ${item.condition_display}
                        </span>
                    </td>
                </tr>
            `).join('');

            const actionsContainer = document.getElementById('view-bast-actions');
            actionsContainer.innerHTML = `
                <button onclick="BASTModule.downloadPDF(${b.id})" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-file-pdf"></i> Unduh Dokumen BAST
                </button>
            `;

            openModal('modal-bast-details');
        } catch (e) {
            showToast('Gagal memuat detail BAST: ' + e.message, 'error');
        }
    },

    downloadPDF(id) {
        window.open(`/api/bast/${id}/pdf/`, '_blank');
        showToast('Mengunduh dokumen BAST...', 'info', 2000);
    }
};

window.BASTModule = BASTModule;
