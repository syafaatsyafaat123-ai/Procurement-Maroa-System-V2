/**
 * Maroa PMS - Purchase Orders Module
 * PT. MAROA TUNGGA ABADI
 */

const PurchaseOrders = {
    currentList: [],

    async load() {
        const container = document.getElementById('view-purchase-orders');
        if (!container) return;
        await this.fetchPOs();
    },

    async fetchPOs(statusFilter = '') {
        const tbody = document.getElementById('table-pos-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat Purchase Order...</td></tr>';

        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const searchVal = document.getElementById('search-po-input')?.value;
            if (searchVal) params.search = searchVal;

            const res = await API.get('/purchase-orders/', params);
            this.currentList = res.results || res || [];
            this.renderTable(this.currentList);
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Gagal memuat PO: ${error.message}</td></tr>`;
        }
    },

    renderTable(list) {
        const tbody = document.getElementById('table-pos-body');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada Purchase Order.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(po => {
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                    <td class="py-3 px-4 font-bold text-teal-800 font-mono-code">${po.po_number}</td>
                    <td class="py-3 px-4 text-slate-600">${po.po_date}</td>
                    <td class="py-3 px-4 font-semibold text-slate-900">${po.supplier_name}</td>
                    <td class="py-3 px-4 text-xs font-mono-code text-blue-800">${po.quotation_number || 'Standalone'}</td>
                    <td class="py-3 px-4 font-bold text-slate-900 text-right">${po.grand_total_formatted}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold badge-issued">
                            ${po.status_display}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="PurchaseOrders.viewDetails(${po.id})" title="Lihat Detail PO" class="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="PurchaseOrders.downloadPDF(${po.id})" title="Download PDF PO" class="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <i class="fa-solid fa-file-pdf"></i>
                            </button>
                            <button onclick="PurchaseOrders.openCreateBASTModal(${po.id})" title="Buat BAST Serah Terima dari PO" class="p-1.5 text-white bg-amber-600 hover:bg-amber-700 rounded-lg text-xs px-2 py-1 font-semibold flex items-center gap-1">
                                <i class="fa-solid fa-clipboard-check"></i> Buat BAST
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async viewDetails(id) {
        try {
            const po = await API.get(`/purchase-orders/${id}/`);
            document.getElementById('view-po-number').textContent = po.po_number;
            document.getElementById('view-po-supplier').textContent = po.supplier_name;
            document.getElementById('view-po-date').textContent = po.po_date;
            document.getElementById('view-po-target-date').textContent = po.expected_delivery_date || 'Sesuai Kesepakatan';
            document.getElementById('view-po-ref-q').textContent = po.quotation_number || 'Standalone PO';
            document.getElementById('view-po-terms').textContent = po.payment_terms;
            document.getElementById('view-po-address').textContent = po.delivery_address;
            document.getElementById('view-po-subtotal').textContent = po.subtotal_formatted;
            document.getElementById('view-po-tax').textContent = po.tax_amount_formatted;
            document.getElementById('view-po-grandtotal').textContent = po.grand_total_formatted;

            const tbody = document.getElementById('view-po-items');
            tbody.innerHTML = (po.items || []).map((item, idx) => `
                <tr class="border-b border-slate-100 text-xs">
                    <td class="p-2 text-center text-slate-400 font-mono-code">${idx + 1}</td>
                    <td class="p-2 font-mono-code font-bold text-teal-900">${item.part_number || '-'}</td>
                    <td class="p-2 text-slate-700">${item.description}</td>
                    <td class="p-2 text-center font-bold">${item.quantity}</td>
                    <td class="p-2 text-center">${item.uom}</td>
                    <td class="p-2 text-right">${formatRupiah(item.unit_price)}</td>
                    <td class="p-2 text-right font-bold text-slate-900">${item.row_total_formatted}</td>
                </tr>
            `).join('');

            const actionsContainer = document.getElementById('view-po-actions');
            actionsContainer.innerHTML = `
                <button onclick="PurchaseOrders.downloadPDF(${po.id})" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-file-pdf"></i> Unduh PDF
                </button>
                <button onclick="PurchaseOrders.openCreateBASTModal(${po.id})" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-clipboard-check"></i> Buat BAST Serah Terima
                </button>
            `;

            openModal('modal-po-details');
        } catch (e) {
            showToast('Gagal memuat detail PO: ' + e.message, 'error');
        }
    },

    downloadPDF(id) {
        window.open(`/api/purchase-orders/${id}/pdf/`, '_blank');
        showToast('Mengunduh dokumen Purchase Order...', 'info', 2000);
    },

    openCreateBASTModal(poId) {
        const po = this.currentList.find(p => p.id === poId);
        if (!po) return;

        document.getElementById('create-bast-poid').value = poId;
        document.getElementById('create-bast-ponumber').textContent = po.po_number;
        document.getElementById('create-bast-vendor').textContent = po.supplier_name;
        document.getElementById('create-bast-date').valueAsDate = new Date();
        document.getElementById('create-bast-handover').value = 'Syafaat / Safar (PT. MAROA TUNGGA ABADI)';
        document.getElementById('create-bast-received').value = po.supplier_detail ? po.supplier_detail.contact_person : '';

        openModal('modal-create-bast-from-po');
    },

    async submitCreateBAST(event) {
        if (event) event.preventDefault();
        const poId = document.getElementById('create-bast-poid').value;
        const doNum = document.getElementById('create-bast-do').value.trim();
        const projName = document.getElementById('create-bast-project').value.trim();
        const handoverBy = document.getElementById('create-bast-handover').value.trim();
        const receivedBy = document.getElementById('create-bast-received').value.trim();
        const bastDate = document.getElementById('create-bast-date').value;

        try {
            const res = await API.post('/bast/create-from-po/', {
                purchase_order_id: poId,
                delivery_order_number: doNum,
                project_name: projName,
                handover_by: handoverBy,
                received_by: receivedBy,
                bast_date: bastDate
            });

            showToast(res.detail, 'success');
            closeModal('modal-create-bast-from-po');
            if (window.BASTModule) window.BASTModule.load();
            if (window.Dashboard) window.Dashboard.load();
        } catch (e) {
            showToast('Gagal membuat BAST: ' + e.message, 'error');
        }
    }
};

window.PurchaseOrders = PurchaseOrders;
