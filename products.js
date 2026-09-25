/**
 * Maroa PMS - Master Products Module
 * PT. MAROA TUNGGA ABADI
 */

const Products = {
    currentList: [],
    categories: [],
    editingId: null,

    async load() {
        const container = document.getElementById('view-products');
        if (!container) return;
        await Promise.all([
            this.fetchCategories(),
            this.fetchProducts()
        ]);
    },

    async fetchCategories() {
        try {
            const res = await API.get('/products/categories/');
            this.categories = res.results || res || [];
            this.populateCategorySelects();
        } catch (e) {
            console.error('Failed to load categories:', e);
        }
    },

    populateCategorySelects() {
        const modalSelect = document.getElementById('product-category-input');
        const filterSelect = document.getElementById('filter-product-category');

        const opts = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        if (modalSelect) modalSelect.innerHTML = '<option value="">-- Tanpa Kategori --</option>' + opts;
        if (filterSelect) filterSelect.innerHTML = '<option value="">Semua Kategori</option>' + opts;
    },

    async fetchProducts() {
        const tbody = document.getElementById('table-products-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat katalog produk...</td></tr>';

        try {
            const params = {};
            const cat = document.getElementById('filter-product-category')?.value;
            const search = document.getElementById('search-product-input')?.value;
            if (cat) params.category = cat;
            if (search) params.search = search;

            const res = await API.get('/products/', params);
            this.currentList = res.results || res || [];
            this.renderTable(this.currentList);
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Gagal memuat produk: ${e.message}</td></tr>`;
        }
    },

    renderTable(list) {
        const tbody = document.getElementById('table-products-body');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada data produk. Klik "+ Tambah Produk".</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(p => `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                <td class="py-3 px-4 font-bold text-blue-900 font-mono-code">${p.part_number}</td>
                <td class="py-3 px-4 font-medium text-slate-900 max-w-sm">
                    <div>${p.description}</div>
                    ${p.specification ? `<div class="text-xs text-slate-400 truncate mt-0.5">${p.specification}</div>` : ''}
                </td>
                <td class="py-3 px-4 font-semibold text-slate-700">${p.brand || '-'}</td>
                <td class="py-3 px-4 text-xs text-slate-500">${p.category_name || '-'}</td>
                <td class="py-3 px-4 text-center text-xs font-bold bg-slate-50 rounded">${p.default_uom}</td>
                <td class="py-3 px-4 font-bold text-slate-900 text-right">${formatRupiah(p.price_estimate)}</td>
                <td class="py-3 px-4 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                        <button onclick="Products.openEditModal(${p.id})" title="Edit Produk" class="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="Products.deleteProduct(${p.id}, '${p.part_number}')" title="Hapus Produk" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('modal-product-title').textContent = 'Tambah Master Produk Baru';
        document.getElementById('form-product').reset();
        openModal('modal-product-form');
    },

    async openEditModal(id) {
        this.editingId = id;
        document.getElementById('modal-product-title').textContent = 'Edit Master Produk';
        try {
            const p = await API.get(`/products/${id}/`);
            document.getElementById('product-part-input').value = p.part_number;
            document.getElementById('product-desc-input').value = p.description;
            document.getElementById('product-spec-input').value = p.specification || '';
            document.getElementById('product-brand-input').value = p.brand || '';
            document.getElementById('product-category-input').value = p.category || '';
            document.getElementById('product-uom-input').value = p.default_uom;
            document.getElementById('product-price-input').value = p.price_estimate;
            openModal('modal-product-form');
        } catch (e) {
            showToast('Gagal memuat detail produk: ' + e.message, 'error');
        }
    },

    async saveProduct(event) {
        if (event) event.preventDefault();
        const partNumber = document.getElementById('product-part-input').value.trim();
        const desc = document.getElementById('product-desc-input').value.trim();

        if (!partNumber || !desc) {
            showToast('Part number dan deskripsi wajib diisi.', 'warning');
            return;
        }

        const payload = {
            part_number: partNumber,
            description: desc,
            specification: document.getElementById('product-spec-input').value.trim(),
            brand: document.getElementById('product-brand-input').value.trim(),
            category: document.getElementById('product-category-input').value || null,
            default_uom: document.getElementById('product-uom-input').value,
            price_estimate: parseFloat(document.getElementById('product-price-input').value) || 0,
            is_active: true
        };

        try {
            if (this.editingId) {
                await API.put(`/products/${this.editingId}/`, payload);
                showToast('Data produk berhasil diperbarui.', 'success');
            } else {
                await API.post('/products/', payload);
                showToast('Produk baru berhasil ditambahkan ke katalog.', 'success');
            }
            closeModal('modal-product-form');
            this.fetchProducts();
            if (window.Quotations) window.Quotations.fetchDependencies();
        } catch (e) {
            showToast('Gagal menyimpan produk: ' + e.message, 'error');
        }
    },

    async deleteProduct(id, partNum) {
        if (confirm(`Apakah Anda yakin ingin menghapus produk '${partNum}'?`)) {
            try {
                await API.delete(`/products/${id}/`);
                showToast(`Produk '${partNum}' berhasil dihapus.`, 'info');
                this.fetchProducts();
            } catch (e) {
                showToast('Gagal menghapus produk: ' + e.message, 'error');
            }
        }
    }
};

window.Products = Products;
