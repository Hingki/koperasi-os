# User Preferences & Rules

## 1. Language & Localization

- **Primary Language:** Bahasa Indonesia.
- All UI text (buttons, labels, messages) MUST be in formal/standard Indonesian.
- Code comments and variable names can remain in English for technical clarity.

## 2. Design Philosophy

- **"Super App" Feel:** The interface should feel like a modern mobile super app (e.g., Gojek/Grab style dashboard).
- **Responsive:** Mobile-first priority. Many users will access via phone.
- **Reference Models:**
  - **Kopdesa.com:** Reference for features (POS, PPOB, Sembako).
  - **SmartCoop.id:** Reference for loan workflow and cooperative standards.

## 3. Specific Feature Requirements

- **POS (Kasir):**
  - Must support "Bayar Pakai Saldo Simpanan".
  - Auto-detect Member vs Non-Member price.
  - Support diskon transaksi (nominal dan persen) yang mempengaruhi total dan kembalian.
  - Tampilkan badge harga dan status konsinyasi pada kartu produk.
  - Barcode scanner modal untuk input cepat, fallback pencarian server jika lokal tidak ada.
  - QRIS payment dengan polling status dan notifikasi keberhasilan/gagal.
  - Pencarian anggota cepat (no. anggota atau nama) untuk mengaktifkan mode harga anggota.
  - Voucher dan Point (penebusan di kasir)
  - Split Bill dan Donasi (pembagian pembayaran dan alokasi donasi)
  - PPN Masukan/Keluaran (per baris transaksi)
  - Stok Opname (penyesuaian stok dan audit)
- **Loans:**
  - "Interest First" (Bunga Menurun/Flat) calculation logic preferred unless specified otherwise.
  - Strict approval workflow (Draft -> Submitted -> Approved -> Disbursed).
  - Autodebet Simpanan Wajib.
  - Pembayaran kredit via QRIS dari aplikasi kasir atau portal.
- **Klinik/Apotek:**
  - Pendaftaran pasien, pelayanan medis/farmasi, racikan/tuslah/embalase, etiket, pembayaran via simpanan/QRIS.
- **Gudang/Cold Storage:**
  - Delivery Order, stok opname gudang, penimbangan, lelang online.
- **Notifikasi & Integrasi:**
  - Pengaturan Email (SMTP) dan WhatsApp Blast untuk informasi transaksi.
- **Integrasi Rujukan:**
  - **Kopdesa (POS retail)**: gaya grid produk, penanda harga dan status, aksi cepat pembayaran.
  - **Smartscoop (pinjaman/keanggotaan)**: alur persetujuan ketat, compliance laporan.

## 4. Development Workflow

- **Bias for Action:** Implement best-practice solutions proactively.
- **Validation:** Always verify builds (`npm run build`) before finishing a task.
- **Database:** Use Migrations for all schema changes.
