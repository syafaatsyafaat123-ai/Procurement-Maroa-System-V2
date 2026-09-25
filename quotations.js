/**
 * Maroa PMS - Quotation Management & Real-time Math Engine
 * PT. MAROA TUNGGA ABADI
 */

const Quotations = {
    currentList: [],
    masterProducts: [],
    masterCustomers: [],
    editingId: null,

    async load() {
        const container = document.getElementById('view-quotations');
        if (!container) return;

        await Promise.all([
            this.fetchQuotations(),
            this.fetchDependencies()
        ]);
    },

    async fetchDependencies() {
        try {
            const [custRes, prodRes] = await Promise.all([
                API.get('/companies/', { type: 'CUSTOMER' }),
                API.get('/products/', { is_active: 'true' })
            ]);
            this.masterCustomers = custRes.results || custRes || [];
            this.masterProducts = prodRes.results || prodRes || [];
            this.populateCustomerSelect();
        } catch (e) {
            console.error('Failed to fetch dependencies:', e);
        }
    },

    populateCustomerSelect() {
        const datalist = document.getElementById('customer-datalist');
        if (datalist) {
            datalist.innerHTML = this.masterCustomers.map(c => 
                `<option value="${c.company_name}">${c.company_name} - ${c.city || 'Makassar'}</option>`
            ).join('');
        }
        
        // Also support fallback select if exists
        const select = document.getElementById('quotation-customer');
        if (select) {
            select.innerHTML = '<option value="">-- Pilih Klien / Customer --</option>' +
                this.masterCustomers.map(c => `<option value="${c.id}">${c.company_name} (${c.city || 'Makassar'})</option>`).join('');
        }
    },

    async generateNewNumber() {
        try {
            const res = await API.get('/quotations/next-number/');
            const numEl = document.getElementById('quotation-number-preview');
            if (numEl && res.next_number) {
                numEl.value = res.next_number;
                showToast(`Nomor penawaran diperbarui: ${res.next_number}`, 'info');
            }
        } catch (e) {
            console.error('Failed to fetch next sequence:', e);
        }
    },

    async fetchQuotations(statusFilter = '') {
        const tbody = document.getElementById('table-quotations-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat data penawaran...</td></tr>';

        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const searchVal = document.getElementById('search-quotation-input')?.value;
            if (searchVal) params.search = searchVal;

            const res = await API.get('/quotations/', params);
            this.currentList = res.results || res || [];
            this.renderTable(this.currentList);
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-red-500">Gagal memuat data: ${error.message}</td></tr>`;
        }
    },

    renderTable(list) {
        const tbody = document.getElementById('table-quotations-body');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-12 text-center text-slate-400">Belum ada penawaran harga. Klik "+ Buat Penawaran Baru".</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(q => {
            const badgeClass = `badge-${q.status.toLowerCase()}`;
            return `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-sm">
                    <td class="py-3 px-4 font-bold text-blue-900 font-mono-code">${q.quotation_number}</td>
                    <td class="py-3 px-4 text-slate-600">${q.date}</td>
                    <td class="py-3 px-4 font-semibold text-slate-900">${q.customer_name}</td>
                    <td class="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">${q.project_reference || q.keterangan || '-'}</td>
                    <td class="py-3 px-4 font-bold text-slate-900 text-right">${q.grand_total_formatted}</td>
                    <td class="py-3 px-4 text-center">
                        <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                            ${q.status_display}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5">
                            <button onclick="Quotations.viewDetails(${q.id})" title="Lihat Detail & Dokumen" class="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="Quotations.openEditModal(${q.id})" title="Edit Penawaran" class="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="Quotations.downloadPDF(${q.id})" title="Download PDF Resmi" class="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                <i class="fa-solid fa-file-pdf"></i>
                            </button>
                            ${q.status === 'APPROVED' || q.status === 'SENT' ? `
                                <button onclick="Quotations.openConvertToPOModal(${q.id})" title="Konversi ke Purchase Order (PO)" class="p-1.5 text-white bg-teal-600 hover:bg-teal-700 rounded-lg text-xs px-2 py-1 font-semibold flex items-center gap-1">
                                    <i class="fa-solid fa-arrow-right"></i> PO
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openCreateModal() {
        this.editingId = null;
        document.getElementById('modal-quotation-title').textContent = 'Buat Penawaran Harga Baru (Sales Letter)';
        document.getElementById('form-quotation').reset();
        document.getElementById('quotation-date').valueAsDate = new Date();
        document.getElementById('quotation-tax-rate').value = '0.11';
        
        // Default values according to Maroa standard
        const locEl = document.getElementById('quotation-location');
        if (locEl) locEl.value = 'Makassar';
        const ketEl = document.getElementById('quotation-keterangan');
        if (ketEl) ketEl.value = 'WBN';
        const contactEl = document.getElementById('quotation-contact-person');
        if (contactEl) contactEl.value = 'Muh. Safar Alparel (0852 5600 6119)';
        const signerEl = document.getElementById('quotation-signer-name');
        if (signerEl) signerEl.value = 'Muh. Safar Alparel';
        const signerTitleEl = document.getElementById('quotation-signer-title');
        if (signerTitleEl) signerTitleEl.value = 'Direktur';
        const custNameEl = document.getElementById('quotation-customer-name');
        if (custNameEl) custNameEl.value = '';

        // Reset items table to 1 empty row
        const tbody = document.getElementById('quotation-items-tbody');
        tbody.innerHTML = '';
        this.addItemRow();
        this.recalculateAll();

        // Fetch predicted sequence number preview (user can edit)
        this.generateNewNumber();

        openModal('modal-quotation-builder');
    },

    async openEditModal(id) {
        this.editingId = id;
        document.getElementById('modal-quotation-title').textContent = 'Edit Penawaran Harga';
        
        try {
            const q = await API.get(`/quotations/${id}/`);
            document.getElementById('quotation-number-preview').value = q.quotation_number;
            document.getElementById('quotation-date').value = q.date;
            
            const custNameEl = document.getElementById('quotation-customer-name');
            if (custNameEl) custNameEl.value = q.customer_name_text || q.customer_name || '';

            const locEl = document.getElementById('quotation-location');
            if (locEl) locEl.value = q.location || 'Makassar';

            const ketEl = document.getElementById('quotation-keterangan');
            if (ketEl) ketEl.value = q.keterangan || q.project_reference || '';

            const contactEl = document.getElementById('quotation-contact-person');
            if (contactEl) contactEl.value = q.contact_person_name || 'Muh. Safar Alparel (0852 5600 6119)';

            const signerEl = document.getElementById('quotation-signer-name');
            if (signerEl) signerEl.value = q.signer_name || 'Muh. Safar Alparel';

            const signerTitleEl = document.getElementById('quotation-signer-title');
            if (signerTitleEl) signerTitleEl.value = q.signer_title || 'Direktur';

            document.getElementById('quotation-validity').value = q.validity_days || 30;
            document.getElementById('quotation-tax-rate').value = q.tax_rate;
            document.getElementById('quotation-internal-notes').value = q.internal_notes || '';
            document.getElementById('quotation-customer-notes').value = q.customer_notes || '';

            const tbody = document.getElementById('quotation-items-tbody');
            tbody.innerHTML = '';

            if (q.items && q.items.length > 0) {
                q.items.forEach(item => {
                    this.addItemRow(item);
                });
            } else {
                this.addItemRow();
            }

            this.recalculateAll();
            openModal('modal-quotation-builder');
        } catch (e) {
            showToast('Gagal memuat detail penawaran: ' + e.message, 'error');
        }
    },

    addItemRow(itemData = null) {
        const tbody = document.getElementById('quotation-items-tbody');
        if (!tbody) return;

        const rowIdx = tbody.children.length + 1;
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-200 item-row animate-fade-in text-xs align-top';

        const productOptions = '<option value="">-- Pilih Master (Opsional) --</option>' +
            this.masterProducts.map(p => `
                <option value="${p.id}" data-part="${p.part_number}" data-desc="${encodeURIComponent(p.description)}" data-uom="${p.default_uom}" data-price="${p.price_estimate}">
                    ${p.part_number} - ${p.description.substring(0, 30)}
                </option>
            `).join('');

        const descVal = itemData ? itemData.description : '';
        const specVal = itemData ? (itemData.specification || '') : '';
        const imgVal = itemData ? (itemData.image || '') : '';
        const wordCount = descVal ? descVal.trim().split(/\s+/).length : 0;

        tr.innerHTML = `
            <td class="p-2 text-center text-slate-400 font-mono-code font-bold item-number-label pt-3">${rowIdx}</td>
            <td class="p-2">
                <div class="space-y-1">
                    <select class="w-full text-[11px] p-1.5 border border-slate-200 rounded-lg bg-slate-50 product-picker" onchange="Quotations.onProductSelected(this)">
                        ${productOptions}
                    </select>
                    <input type="text" placeholder="MPN / Part No." class="w-full text-xs font-mono-code p-1.5 border border-slate-200 rounded-lg font-bold item-part-number" value="${itemData ? (itemData.part_number || '') : ''}">
                </div>
            </td>
            <td class="p-2">
                <div class="space-y-1.5">
                    <div class="relative">
                        <textarea placeholder="Deskripsi item barang/jasa..." rows="2" class="w-full text-xs p-1.5 border border-slate-200 rounded-lg item-description" oninput="Quotations.onDescriptionInput(this)">${descVal}</textarea>
                        <div class="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Maks. 200 kata</span>
                            <span class="word-counter-badge word-count-valid">${wordCount} / 200 kata</span>
                        </div>
                    </div>
                    <!-- Image Upload / Attachment -->
                    <div class="flex items-center gap-2">
                        <input type="hidden" class="item-image-data" value="${imgVal}">
                        <label class="cursor-pointer px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded text-[10px] font-semibold border border-slate-200 inline-flex items-center gap-1">
                            <i class="fa-solid fa-image"></i>
                            <span>Upload Foto</span>
                            <input type="file" accept="image/*" class="hidden item-image-file" onchange="Quotations.onImageSelected(this)">
                        </label>
                        <div class="item-img-preview-box flex items-center gap-1.5 ${imgVal ? '' : 'hidden'}">
                            <img src="${imgVal}" class="w-7 h-7 object-contain rounded border border-slate-300 bg-white item-img-thumbnail" alt="Preview">
                            <button type="button" onclick="Quotations.removeImage(this)" title="Hapus Gambar" class="text-red-500 hover:text-red-700 text-xs">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </td>
            <td class="p-2">
                <input type="text" placeholder="Spesifikasi / Size" class="w-full text-xs p-1.5 border border-slate-200 rounded-lg item-specification" value="${specVal}">
            </td>
            <td class="p-2">
                <input type="number" step="0.01" min="0.01" class="w-16 text-center text-xs p-1.5 border border-slate-200 rounded-lg font-bold item-qty" value="${itemData ? itemData.quantity : 1}" oninput="Quotations.recalculateRow(this)">
            </td>
            <td class="p-2">
                <select class="text-xs p-1.5 border border-slate-200 rounded-lg item-uom">
                    <option value="PC" ${itemData && (itemData.uom === 'PC' || itemData.uom === 'PCS') ? 'selected' : ''}>PC</option>
                    <option value="PCS" ${itemData && itemData.uom === 'PCS' ? 'selected' : ''}>PCS</option>
                    <option value="PAA" ${itemData && itemData.uom === 'PAA' ? 'selected' : ''}>PAA</option>
                    <option value="PAC" ${itemData && itemData.uom === 'PAC' ? 'selected' : ''}>PAC</option>
                    <option value="SET" ${itemData && itemData.uom === 'SET' ? 'selected' : ''}>SET</option>
                    <option value="ROLL" ${itemData && itemData.uom === 'ROLL' ? 'selected' : ''}>ROLL</option>
                    <option value="UNIT" ${itemData && itemData.uom === 'UNIT' ? 'selected' : ''}>UNIT</option>
                    <option value="MTR" ${itemData && itemData.uom === 'MTR' ? 'selected' : ''}>MTR</option>
                    <option value="LOT" ${itemData && itemData.uom === 'LOT' ? 'selected' : ''}>LOT</option>
                    <option value="BOX" ${itemData && itemData.uom === 'BOX' ? 'selected' : ''}>BOX</option>
                    <option value="KG" ${itemData && itemData.uom === 'KG' ? 'selected' : ''}>KG</option>
                    <option value="LTR" ${itemData && itemData.uom === 'LTR' ? 'selected' : ''}>LTR</option>
                </select>
            </td>
            <td class="p-2">
                <input type="number" step="100" min="0" class="w-28 text-right text-xs p-1.5 border border-slate-200 rounded-lg font-bold item-unit-price" value="${itemData ? itemData.unit_price : 0}" oninput="Quotations.recalculateRow(this)">
            </td>
            <td class="p-2 text-right font-bold text-xs text-blue-900 item-row-total-display pt-3">
                ${itemData ? formatRupiah(itemData.row_total) : 'Rp 0'}
            </td>
            <td class="p-2 text-center pt-3">
                <button type="button" onclick="Quotations.removeRow(this)" class="text-red-400 hover:text-red-600 p-1">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);

        // Pre-select product if present
        if (itemData && itemData.product) {
            const picker = tr.querySelector('.product-picker');
            if (picker) picker.value = itemData.product;
        }
    },

    onImageSelected(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;

        // Limit size to 2MB for base64 embed
        if (file.size > 2 * 1024 * 1024) {
            showToast('Ukuran gambar terlalu besar. Maksimal 2MB.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const container = fileInput.closest('td');
            const hiddenInput = container.querySelector('.item-image-data');
            const previewBox = container.querySelector('.item-img-preview-box');
            const imgEl = container.querySelector('.item-img-thumbnail');

            if (hiddenInput) hiddenInput.value = dataUrl;
            if (imgEl) imgEl.src = dataUrl;
            if (previewBox) previewBox.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    },

    removeImage(btn) {
        const container = btn.closest('td');
        const hiddenInput = container.querySelector('.item-image-data');
        const previewBox = container.querySelector('.item-img-preview-box');
        const fileInput = container.querySelector('.item-image-file');

        if (hiddenInput) hiddenInput.value = '';
        if (fileInput) fileInput.value = '';
        if (previewBox) previewBox.classList.add('hidden');
    },

    removeRow(btn) {
        const tbody = document.getElementById('quotation-items-tbody');
        if (tbody.children.length <= 1) {
            showToast('Penawaran harus memiliki minimal 1 baris item.', 'warning');
            return;
        }
        btn.closest('tr').remove();
        
        // Re-index row numbers
        Array.from(tbody.children).forEach((tr, idx) => {
            const label = tr.querySelector('.item-number-label');
            if (label) label.textContent = idx + 1;
        });

        this.recalculateAll();
    },

    onProductSelected(selectEl) {
        const option = selectEl.selectedOptions[0];
        if (!option || !option.value) return;

        const tr = selectEl.closest('tr');
        const partInput = tr.querySelector('.item-part-number');
        const descInput = tr.querySelector('.item-description');
        const uomSelect = tr.querySelector('.item-uom');
        const priceInput = tr.querySelector('.item-unit-price');

        if (partInput) partInput.value = option.dataset.part || '';
        if (descInput) {
            descInput.value = decodeURIComponent(option.dataset.desc || '');
            this.onDescriptionInput(descInput);
        }
        if (uomSelect && option.dataset.uom) uomSelect.value = option.dataset.uom;
        if (priceInput && Number(option.dataset.price) > 0) priceInput.value = option.dataset.price;

        this.recalculateRow(priceInput);
    },

    onDescriptionInput(textarea) {
        const text = textarea.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        const container = textarea.parentElement;
        const badge = container.querySelector('.word-counter-badge');

        if (badge) {
            badge.textContent = `${words} / 200 kata`;
            badge.className = 'word-counter-badge ';
            if (words > 200) {
                badge.className += 'word-count-danger';
            } else if (words > 170) {
                badge.className += 'word-count-warn';
            } else {
                badge.className += 'word-count-valid';
            }
        }
    },

    recalculateRow(inputEl) {
        const tr = inputEl.closest('tr');
        const qty = parseFloat(tr.querySelector('.item-qty').value) || 0;
        const price = parseFloat(tr.querySelector('.item-unit-price').value) || 0;
        const rowTotal = qty * price;

        const display = tr.querySelector('.item-row-total-display');
        if (display) {
            display.textContent = formatRupiah(rowTotal);
        }

        this.recalculateAll();
    },

    recalculateAll() {
        const tbody = document.getElementById('quotation-items-tbody');
        if (!tbody) return;

        let subtotal = 0;
        Array.from(tbody.children).forEach(tr => {
            const qty = parseFloat(tr.querySelector('.item-qty')?.value) || 0;
            const price = parseFloat(tr.querySelector('.item-unit-price')?.value) || 0;
            subtotal += (qty * price);
        });

        const taxRate = parseFloat(document.getElementById('quotation-tax-rate')?.value) || 0;
        const taxAmount = subtotal * taxRate;
        const grandTotal = subtotal + taxAmount;

        // Update displays
        document.getElementById('quotation-summary-subtotal').textContent = formatRupiah(subtotal);
        document.getElementById('quotation-summary-tax').textContent = formatRupiah(taxAmount);
        document.getElementById('quotation-summary-grandtotal').textContent = formatRupiah(grandTotal);
    },

    async saveQuotation(event) {
        if (event) event.preventDefault();
        
        const customerNameInput = document.getElementById('quotation-customer-name')?.value.trim();
        const quotationNumberInput = document.getElementById('quotation-number-preview')?.value.trim();
        const dateVal = document.getElementById('quotation-date').value;

        if (!customerNameInput) {
            showToast('Silakan isi Nama Klien / Customer terlebih dahulu.', 'warning');
            return;
        }

        // Collect items
        const tbody = document.getElementById('quotation-items-tbody');
        const items = [];
        let hasWordError = false;

        Array.from(tbody.children).forEach((tr, idx) => {
            const desc = tr.querySelector('.item-description').value.trim();
            const words = desc ? desc.split(/\s+/).length : 0;
            if (words > 200) {
                hasWordError = true;
            }

            items.push({
                product: tr.querySelector('.product-picker').value || null,
                part_number: tr.querySelector('.item-part-number').value.trim(),
                description: desc || 'Item Pengadaan Barang/Jasa',
                specification: tr.querySelector('.item-specification')?.value.trim() || '',
                image: tr.querySelector('.item-image-data')?.value || '',
                quantity: parseFloat(tr.querySelector('.item-qty').value) || 1,
                uom: tr.querySelector('.item-uom').value,
                unit_price: parseFloat(tr.querySelector('.item-unit-price').value) || 0,
                order_index: idx + 1
            });
        });

        if (hasWordError) {
            showToast('Terdapat deskripsi item yang melebihi batas 200 kata. Mohon ringkas.', 'error');
            return;
        }

        if (items.length === 0) {
            showToast('Tambahkan minimal 1 item penawaran.', 'warning');
            return;
        }

        const payload = {
            quotation_number: quotationNumberInput,
            customer_name_text: customerNameInput,
            date: dateVal,
            location: document.getElementById('quotation-location')?.value.trim() || 'Makassar',
            keterangan: document.getElementById('quotation-keterangan')?.value.trim() || 'WBN',
            project_reference: document.getElementById('quotation-keterangan')?.value.trim() || 'WBN',
            contact_person_name: document.getElementById('quotation-contact-person')?.value.trim() || 'Muh. Safar Alparel (0852 5600 6119)',
            signer_name: document.getElementById('quotation-signer-name')?.value.trim() || 'Muh. Safar Alparel',
            signer_title: document.getElementById('quotation-signer-title')?.value.trim() || 'Direktur',
            validity_days: parseInt(document.getElementById('quotation-validity').value) || 30,
            tax_rate: document.getElementById('quotation-tax-rate').value,
            internal_notes: document.getElementById('quotation-internal-notes').value.trim(),
            customer_notes: document.getElementById('quotation-customer-notes').value.trim(),
            items
        };

        const btn = document.getElementById('btn-save-quotation');
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';
            }

            if (this.editingId) {
                await API.put(`/quotations/${this.editingId}/`, payload);
                showToast('Penawaran harga berhasil diperbarui.', 'success');
            } else {
                await API.post('/quotations/', payload);
                showToast('Penawaran harga baru (Sales Letter) berhasil diterbitkan.', 'success');
            }

            closeModal('modal-quotation-builder');
            this.fetchQuotations();
            if (window.Dashboard) window.Dashboard.load();
        } catch (error) {
            showToast('Gagal menyimpan penawaran: ' + error.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-2"></i> Simpan Penawaran';
            }
        }
    },

    async viewDetails(id) {
        try {
            const q = await API.get(`/quotations/${id}/`);
            document.getElementById('view-q-number').textContent = q.quotation_number;
            document.getElementById('view-q-customer').textContent = q.customer_name;
            document.getElementById('view-q-date').textContent = q.date;
            document.getElementById('view-q-status').textContent = q.status_display;
            document.getElementById('view-q-status').className = `px-3 py-1 rounded-full text-xs font-bold badge-${q.status.toLowerCase()}`;
            document.getElementById('view-q-ref').textContent = q.keterangan || q.project_reference || '-';
            document.getElementById('view-q-validity').textContent = `${q.validity_days} Hari Kalender`;
            document.getElementById('view-q-payment').textContent = q.payment_terms || '-';
            document.getElementById('view-q-delivery').textContent = q.delivery_terms || '-';
            document.getElementById('view-q-subtotal').textContent = q.subtotal_formatted;
            document.getElementById('view-q-tax').textContent = q.tax_amount_formatted;
            document.getElementById('view-q-grandtotal').textContent = q.grand_total_formatted;

            // Render Items
            const tbody = document.getElementById('view-q-items');
            tbody.innerHTML = (q.items || []).map((item, idx) => `
                <tr class="border-b border-slate-100 text-xs">
                    <td class="p-2 text-center text-slate-400 font-mono-code">${idx + 1}</td>
                    <td class="p-2 font-mono-code font-bold text-blue-900">${item.part_number || '-'}</td>
                    <td class="p-2 text-slate-700">
                        <div class="font-bold">${item.description}</div>
                        ${item.specification ? `<div class="text-[11px] text-slate-500">${item.specification}</div>` : ''}
                        ${item.image ? `<img src="${item.image}" class="h-10 mt-1 object-contain rounded border border-slate-200">` : ''}
                    </td>
                    <td class="p-2 text-center font-bold">${item.quantity}</td>
                    <td class="p-2 text-center">${item.uom}</td>
                    <td class="p-2 text-right">${formatRupiah(item.unit_price)}</td>
                    <td class="p-2 text-right font-bold text-slate-900">${item.row_total_formatted}</td>
                </tr>
            `).join('');

            // Actions setup
            const actionsContainer = document.getElementById('view-q-actions');
            actionsContainer.innerHTML = `
                <button onclick="Quotations.downloadPDF(${q.id})" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-file-pdf"></i> Unduh PDF
                </button>
                <button onclick="Quotations.openPreviewDoc(${q.id})" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-print"></i> Cetak / Preview
                </button>
                <div class="relative inline-block text-left">
                    <select onchange="Quotations.changeStatus(${q.id}, this.value)" class="text-xs font-semibold p-1.5 border border-slate-300 rounded-lg bg-white">
                        <option value="">Ubah Status...</option>
                        <option value="DRAFT" ${q.status === 'DRAFT' ? 'disabled' : ''}>Set ke DRAFT</option>
                        <option value="SENT" ${q.status === 'SENT' ? 'disabled' : ''}>Set ke SENT</option>
                        <option value="APPROVED" ${q.status === 'APPROVED' ? 'disabled' : ''}>Set ke APPROVED</option>
                        <option value="REJECTED" ${q.status === 'REJECTED' ? 'disabled' : ''}>Set ke REJECTED</option>
                    </select>
                </div>
            `;

            openModal('modal-quotation-details');
        } catch (e) {
            showToast('Gagal memuat detail: ' + e.message, 'error');
        }
    },

    async changeStatus(id, newStatus) {
        if (!newStatus) return;
        try {
            await API.post(`/quotations/${id}/set-status/`, { status: newStatus });
            showToast(`Status penawaran berhasil diubah ke ${newStatus}`, 'success');
            closeModal('modal-quotation-details');
            this.fetchQuotations();
            if (window.Dashboard) window.Dashboard.load();
        } catch (e) {
            showToast('Gagal mengubah status: ' + e.message, 'error');
        }
    },

    downloadPDF(id) {
        window.open(`/api/quotations/${id}/pdf/`, '_blank');
        showToast('Mengunduh dokumen PDF resmi...', 'info', 2000);
    },

    openPreviewDoc(id) {
        const frame = document.getElementById('preview-doc-iframe');
        if (frame) {
            frame.src = `/api/quotations/${id}/preview/`;
            openModal('modal-doc-preview');
        }
    },

    openConvertToPOModal(quotationId) {
        const q = this.currentList.find(item => item.id === quotationId);
        if (!q) return;

        document.getElementById('convert-po-qid').value = quotationId;
        document.getElementById('convert-po-qnumber').textContent = q.quotation_number;
        document.getElementById('convert-po-customer').textContent = q.customer_name;
        document.getElementById('convert-po-total').textContent = q.grand_total_formatted;
        document.getElementById('convert-po-date').valueAsDate = new Date();

        // Populate supplier options
        API.get('/companies/', { type: 'SUPPLIER' }).then(res => {
            const suppliers = res.results || res || [];
            const select = document.getElementById('convert-po-supplier');
            if (select) {
                select.innerHTML = '<option value="">-- Pilih Vendor / Supplier Pengadaan --</option>' +
                    suppliers.map(s => `<option value="${s.id}">${s.company_name} (${s.city})</option>`).join('');
            }
        });

        openModal('modal-convert-po');
    },

    async submitConvertToPO(event) {
        if (event) event.preventDefault();
        const quotationId = document.getElementById('convert-po-qid').value;
        const supplierId = document.getElementById('convert-po-supplier').value;
        const poDate = document.getElementById('convert-po-date').value;
        const deliveryDate = document.getElementById('convert-po-delivery-date').value;

        try {
            const res = await API.post('/purchase-orders/convert-from-quotation/', {
                quotation_id: quotationId,
                supplier_id: supplierId || null,
                po_date: poDate,
                expected_delivery_date: deliveryDate || null
            });

            showToast(res.detail, 'success');
            closeModal('modal-convert-po');
            this.fetchQuotations();
            if (window.PurchaseOrders) window.PurchaseOrders.load();
            if (window.Dashboard) window.Dashboard.load();
        } catch (e) {
            showToast('Gagal konversi ke PO: ' + e.message, 'error');
        }
    }
};

window.Quotations = Quotations;
