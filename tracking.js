/**
 * Maroa PMS - Global Search & Lifecycle Tracking Module
 * PT. MAROA TUNGGA ABADI
 */

const Tracking = {
    searchTimeout: null,

    init() {
        const input = document.getElementById('global-search-input');
        if (input) {
            input.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                const q = e.target.value.trim();
                if (q.length < 2) {
                    this.hideSearchResults();
                    return;
                }
                this.searchTimeout = setTimeout(() => this.performGlobalSearch(q), 300);
            });

            // Hide search on click outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#global-search-container')) {
                    this.hideSearchResults();
                }
            });
        }
    },

    async performGlobalSearch(query) {
        const resultsEl = document.getElementById('global-search-results');
        if (!resultsEl) return;

        resultsEl.innerHTML = '<div class="p-3 text-xs text-slate-400 text-center"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Mencari seluruh modul...</div>';
        resultsEl.classList.remove('hidden');

        try {
            const res = await API.get('/tracking/search/', { q: query });
            const list = res.results || [];

            if (list.length === 0) {
                resultsEl.innerHTML = '<div class="p-4 text-xs text-slate-400 text-center">Tidak ditemukan hasil untuk "' + query + '".</div>';
                return;
            }

            resultsEl.innerHTML = list.map(item => `
                <div onclick="Tracking.onSearchResultClick('${item.type}', ${item.id})" class="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer flex items-center justify-between text-xs transition">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-${item.badge_color}-100 text-${item.badge_color}-800">
                                ${item.type}
                            </span>
                            <span class="font-bold text-slate-900">${item.title}</span>
                        </div>
                        <div class="text-slate-500 mt-0.5">${item.subtitle}</div>
                    </div>
                    <div class="text-right font-semibold text-slate-700 font-mono-code">${item.amount || ''}</div>
                </div>
            `).join('');
        } catch (e) {
            resultsEl.innerHTML = `<div class="p-3 text-xs text-red-500 text-center">Pencarian gagal: ${e.message}</div>`;
        }
    },

    hideSearchResults() {
        const resultsEl = document.getElementById('global-search-results');
        if (resultsEl) resultsEl.classList.add('hidden');
    },

    onSearchResultClick(type, id) {
        this.hideSearchResults();
        if (type === 'QUOTATION' && window.Quotations) {
            App.navigate('quotations');
            Quotations.viewDetails(id);
        } else if (type === 'PURCHASE_ORDER' && window.PurchaseOrders) {
            App.navigate('purchase-orders');
            PurchaseOrders.viewDetails(id);
        } else if (type === 'BAST' && window.BASTModule) {
            App.navigate('bast');
            BASTModule.viewDetails(id);
        } else if (type === 'PRODUCT' && window.Products) {
            App.navigate('products');
            Products.openEditModal(id);
        } else if (type === 'COMPANY' && window.Companies) {
            App.navigate('companies');
            Companies.openEditModal(id);
        }
    },

    async loadLifecycle() {
        const container = document.getElementById('view-tracking');
        if (!container) return;

        const partOrDoc = document.getElementById('lifecycle-search-input')?.value || 'VLV-BL-KITZ-4IN-150';
        await this.fetchLifecycleTimeline(partOrDoc);
    },

    async fetchLifecycleTimeline(query = '') {
        const container = document.getElementById('lifecycle-timeline-container');
        if (!container) return;

        container.innerHTML = '<div class="py-12 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Melacak alur pengadaan & dokumen...</div>';

        try {
            const params = {};
            if (query.includes('QS')) params.quotation_id = 1;
            else if (query.includes('PO')) params.po_id = 1;
            else if (query.includes('BAST')) params.bast_id = 1;
            else params.part_number = query;

            const res = await API.get('/tracking/lifecycle/', params);
            const steps = res.steps || [];

            container.innerHTML = `
                <div class="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    ${steps.map((step, idx) => {
                        const isDone = step.status === 'COMPLETED';
                        const dotColor = isDone ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-300';
                        const icon = isDone ? 'fa-check text-white' : 'fa-clock text-slate-500';

                        return `
                            <div class="relative group">
                                <div class="absolute -left-6 top-1.5 w-6 h-6 rounded-full ${dotColor} flex items-center justify-center text-[10px]">
                                    <i class="fa-solid ${icon}"></i>
                                </div>
                                <div class="bg-white p-5 rounded-xl border border-slate-200 card-shadow">
                                    <div class="flex flex-wrap items-center justify-between gap-2">
                                        <h4 class="font-bold text-slate-900 text-sm">${step.title}</h4>
                                        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                                            ${step.status}
                                        </span>
                                    </div>
                                    <div class="mt-2 text-xs text-slate-600">
                                        <div class="font-mono-code font-bold text-blue-900">${step.number}</div>
                                        <div class="mt-1 font-medium text-slate-800">${step.details}</div>
                                        <div class="text-slate-400 mt-1">${step.description}</div>
                                    </div>
                                    <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                                        <span>Tanggal Rekam: <strong>${step.date}</strong></span>
                                        <span class="font-semibold text-slate-600">PT. MAROA TUNGGA ABADI PMS</span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } catch (e) {
            container.innerHTML = `<div class="py-12 text-center text-red-500">Gagal melacak lifecycle: ${e.message}</div>`;
        }
    }
};

window.Tracking = Tracking;
