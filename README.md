# MAROA Procurement Management System (MAROA PMS)

<div align="center">
  <img src="static/img/maroa_logo.png" alt="PT. MAROA TUNGGA ABADI Logo" width="140"/>
  <h3><strong>PT. MAROA TUNGGA ABADI</strong></h3>
  <p><em>General Supplier & Contractor Procurement Portal</em></p>
  <p>
    <strong>Sistem Informasi Manajemen Pengadaan Terintegrasi: Quotation (Sales Letter), Purchase Order (PO), Berita Acara Serah Terima (BAST), Lifecycle Tracking & Audit Log</strong>
  </p>
</div>

---

## 📌 Tentang Aplikasi

**MAROA PMS** adalah aplikasi Enterprise Procurement Management System yang dibangun untuk mengelola seluruh rantai pengadaan barang dan jasa pada **PT. MAROA TUNGGA ABADI**. Sistem ini dirancang untuk mempercepat pembuatan dokumen penawaran harga, pesanan pembelian, dan berita acara serah terima dengan format presisi tinggi, stempel digital resmi, serta kalkulasi finansial otomatis.

---

## 🚀 Fitur Unggulan

### 1. Quotation & Sales Letter Builder
- **Input Klien Fleksibel**: Bebas mengetik nama klien baru secara manual dengan bantuan fitur *auto-complete datalist*.
- **Kustomisasi Nomor Dokumen**: Sequence / nomor surat penawaran (contoh: `2108/QS/MTA/IX/2026`) dapat diubah manual atau digenerate otomatis melalui tombol *Auto Gen*.
- **Upload & Lampiran Foto Barang**: Setiap baris item pengadaan dilengkapi fitur upload foto produk untuk ditampilkan langsung pada tabel penawaran dan dokumen PDF.
- **Validasi Deskripsi**: Proteksi integritas data dengan counter batas maksimal 200 kata per deskripsi item.
- **Real-time Financial Engine**: Kalkulasi otomatis Subtotal, PPN (11% atau 0%), dan Grand Total saat input kuantitas & harga satuan.

### 2. Export & Cetak Dokumen PDF Presisi
- **Sales Letter Resmi**: Desain header logo MAROA, aksen garis biru, kotak metadata pengajuan, rincian tabel MPN/Deskripsi/Foto/Spesifikasi, klausul catatan penawaran, kontak narahubung (`Muh. Safar Alparel - 0852 5600 6119`), stempel bulat biru resmi *PT. MAROA TUNGGA ABADI MAKASSAR*, dan tanda tangan Direktur.
- **Berita Acara Serah Terima (BAST)**: Template serah terima barang lengkap dengan nomor PO, daftar material, dan tanda tangan ganda (Penerima & Hormat Kami).
- **Purchase Order (PO)**: Konversi instan 1-klik dari Penawaran yang telah disetujui (*Approved*) ke PO Vendor.

### 3. Lifecycle Tracking & Master Data
- **End-to-End Tracking**: Pelacakan status alur dokumen dari `DRAFT` $\rightarrow$ `SENT` $\rightarrow$ `APPROVED` $\rightarrow$ `PO CREATED` $\rightarrow$ `BAST COMPLETED`.
- **Master Data**: Katalog produk, nomor part/MPN, data supplier/vendor, dan customer.
- **Audit Log Terperinci**: Riwayat seluruh aktivitas pengguna dan perubahan status dokumen.

### 4. Role-Based Access Control (RBAC) & Gatekeeper Login
- Portal login terproteksi sebelum masuk ke tampilan dashboard.
- Hak akses hierarki sesuai jabatan:
  - **Direktur** (Full Access & Approval)
  - **Operational Manager** (Manajemen Operasional & Pengadaan)
  - **Staff Procurement** (Input & Pemrosesan Dokumen)

---

## 👥 Akun Pengguna & Jabatan Default

Semua akun menggunakan password bawaan: `1114ROA`

| Username | Nama Lengkap | Jabatan | Role Akses | Password |
| :--- | :--- | :--- | :--- | :--- |
| **`safar`** | Muh. Safar Alparel | **Direktur** | `ADMIN` (Full Control) | `1114ROA` |
| **`surya`** | Surya | **Operational Manager** | `PROCUREMENT` | `1114ROA` |
| **`syafaat`** | Syafaat | **Staff Procurement** | `PROCUREMENT` / Staff | `1114ROA` |

---

## 🏢 Daftar Rekanan Customer Terdaftar

1. **PT SINAR TERANG MANDIRI**
2. **PT TRAKINDO UTAMA**
3. **PT GUNUNG SAMUDERA INTERNASIONAL**
4. **PT KOREA ENERGI**
5. **PT TIGA PILAR ENERGI**

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, Django 5.x, Django REST Framework (DRF)
- **Frontend**: HTML5, Modern Vanilla JavaScript (ES6+), Tailwind CSS, FontAwesome 6
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **PDF Engine**: HTML5/CSS3 Print Renderer & xhtml2pdf / ReportLab
- **Security & Config**: Token Authentication, python-decouple

---

## ⚙️ Panduan Instalasi & Menjalankan Lokal

### 1. Clone Repository
```bash
git clone https://github.com/username-anda/maroa-pms.git
cd maroa-pms
```

### 2. Buat & Aktifkan Virtual Environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / MacOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Salin Konfigurasi Environment (Opsional)
```bash
# Windows
copy .env.example .env

# Linux / MacOS
cp .env.example .env
```

### 5. Jalankan Database Migration & Seed Data
```bash
python manage.py migrate
python update_seed.py
```

### 6. Jalankan Server Django
```bash
python manage.py runserver
```

Akses aplikasi di browser: **`http://127.0.0.1:8000/`**

---

## 📁 Struktur Direktori

```text
maroa_pms/
├── accounts/           # User authentication, profiles, RBAC
├── audit_logs/         # System audit trail and activity logger
├── bast/               # Berita Acara Serah Terima module & PDF
├── companies/          # Master data Customer & Vendor/Supplier
├── core/               # Shared utilities, numbering sequence engine
├── dashboard/          # Summary metrics and analytical widgets
├── products/           # Master products, part numbers, UOM
├── purchase_orders/    # Purchase Order management & conversion
├── quotations/         # Quotations & Sales Letter generator
├── static/
│   ├── css/            # Custom style sheets
│   ├── img/            # Assets (maroa_logo.png)
│   └── js/             # Modular ES6 controllers (SPA Router, API, modules)
├── templates/
│   ├── index.html      # Main Single Page Application shell
│   └── pdf/            # Document print/PDF templates (Sales Letter, BAST, PO)
├── tracking/           # Procurement lifecycle tracking
├── manage.py
├── requirements.txt
└── update_seed.py      # Master database seeder
```

---

## 📄 Lisensi & Hak Cipta

© 2026 **PT. MAROA TUNGGA ABADI**. All Rights Reserved.  
*Jl. Sultan Dg. Raja No. 59, Ruko No. 63, Timungan Lompoa, Bontoala, Kota Makassar, Sulawesi Selatan – 90152*  
Email: `shafaralfarel@gmail.com` | Phone: `0852 5600 6119` | Instagram: `@maroatunggaabadi`
