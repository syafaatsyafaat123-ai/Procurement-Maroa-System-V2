/**
 * Maroa PMS - Master Companies (Customers & Suppliers) Module
 * PT. MAROA TUNGGA ABADI
 */

const Companies = {
    currentList: [],
    editingId: null,

    async load() {
        const container = document.getElementById('view-companies');
        if (!container) return;
        await this.fetchCompanies();
    },

    async fetchCompanies(typeFilter = '') {
        const tbody = document.getElementById('table-companies-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat data mitra & rekanan...</td></tr>';

        try {
            const params = {};
            if (typeFilter) params.type = typeFilter;
            const search = document.getElementById('search-company-input')?.value;
            if (search) params.search = search;

            const res = await API.get('/companies/', params);
            this.currentList = res.results || res || [];
            this.renderTable(this.currentList);
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Gagal memuat rekanan: ${e.message}</td></tr>`;
        }
    },

    renderTable(list) {
        const tbody = document.getElementById('table-companies-body');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada data rekanan. Klik "+ Tambah Perusahaan".</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(c => {
            let badge = 'bg-blue-100 text-blue-800';
            if (c.company_type === 'SUPPLIER') badge = 'bg-teal-100 text-teal-800';
            if (c.company_type === 'BOTH') badge = 'bg-purple-100 text-purple-800';

            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                    <td class="py-3 px-4 font-bold text-slate-900">${c.company_name}</td>
                    <td class="py-3 px-4">
                        <span class="px-2.5 py-0.5 rounded text-xs font-semibold ${badge}">
                            ${c.company_type_display}
                        </span>
                    </td>
                    <td class="py-3 px-4 font-medium text-slate-700">${c.contact_person || '-'}</td>
                    <td class="py-3 px-4 text-xs text-slate-600">${c.phone || '-'}<br><span class="text-slate-400">${c.email || ''}</span></td>
                    <td class="py-3 px-4 text-xs text-slate-600">${c.city || 'Makassar'}</td>
                    <td class="py-3 px-4 font-mono-code text-xs text-slate-500">${c.tax_number || '-'}</td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="Companies.openEditModal(${c.id})" title="Edit Perusahaan" class="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="Companies.deleteCompany(${c.id}, '${c.company_name}')" title="Hapus Perusahaan" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('modal-company-title').textContent = 'Tambah Perusahaan (Customer / Vendor)';
        document.getElementById('form-company').reset();
        openModal('modal-company-form');
    },

    async openEditModal(id) {
        this.editingId = id;
        document.getElementById('modal-company-title').textContent = 'Edit Data Perusahaan';
        try {
            const c = await API.get(`/companies/${id}/`);
            document.getElementById('company-name-input').value = c.company_name;
            document.getElementById('company-type-input').value = c.company_type;
            document.getElementById('company-contact-input').value = c.contact_person || '';
            document.getElementById('company-phone-input').value = c.phone || '';
            document.getElementById('company-email-input').value = c.email || '';
            document.getElementById('company-city-input').value = c.city || '';
            document.getElementById('company-tax-input').value = c.tax_number || '';
            document.getElementById('company-address-input').value = c.address || '';
            openModal('modal-company-form');
        } catch (e) {
            showToast('Gagal memuat profil perusahaan: ' + e.message, 'error');
        }
    },

    async saveCompany(event) {
        if (event) event.preventDefault();
        const name = document.getElementById('company-name-input').value.trim();
        const type = document.getElementById('company-type-input').value;

        if (!name) {
            showToast('Nama perusahaan wajib diisi.', 'warning');
            return;
        }

        const payload = {
            company_name: name,
            company_type: type,
            contact_person: document.getElementById('company-contact-input').value.trim(),
            phone: document.getElementById('company-phone-input').value.trim(),
            email: document.getElementById('company-email-input').value.trim(),
            city: document.getElementById('company-city-input').value.trim() || 'Makassar',
            tax_number: document.getElementById('company-tax-input').value.trim(),
            address: document.getElementById('company-address-input').value.trim(),
            is_active: true
        };

        try {
            if (this.editingId) {
                await API.put(`/companies/${this.editingId}/`, payload);
                showToast('Data perusahaan berhasil diperbarui.', 'success');
            } else {
                await API.post('/companies/', payload);
                showToast('Perusahaan baru berhasil disimpan.', 'success');
            }
            closeModal('modal-company-form');
            this.fetchCompanies();
            if (window.Quotations) window.Quotations.fetchDependencies();
        } catch (e) {
            showToast('Gagal menyimpan perusahaan: ' + e.message, 'error');
        }
    },

    async deleteCompany(id, name) {
        if (confirm(`Apakah Anda yakin ingin menghapus rekanan '${name}'?`)) {
            try {
                await API.delete(`/companies/${id}/`);
                showToast(`Perusahaan '${name}' berhasil dihapus.`, 'info');
                this.fetchCompanies();
            } catch (e) {
                showToast('Gagal menghapus perusahaan: ' + e.message, 'error');
            }
        }
    }
};

window.Companies = Companies;
