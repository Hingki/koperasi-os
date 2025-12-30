# Project Rules & Architecture Guidelines

## 1. Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database & Auth:** Supabase
- **Styling:** Tailwind CSS + Shadcn UI
- **Icons:** Lucide React

## 2. Architecture Patterns

- **Service Layer:** All complex business logic MUST reside in `src/lib/services/` (e.g., `LoanService`, `LedgerService`, `RetailService`).
- **Server Actions:** Use Next.js Server Actions for data mutations (POST/PUT/DELETE). Locate in `src/lib/actions/`.
- **Client Components:** Use `'use client'` only when necessary (interactive UI). Prefer Server Components for data fetching.
- **Supabase Client:** Use `createClient` from `@/lib/supabase/server` for server components/actions, and `@/lib/supabase/client` for client components.

## 3. Business Logic Standards

- **Accounting Standard:** SAK-EP (Standar Akuntansi Keuangan Entitas Privat).
  - Every financial transaction MUST create a Ledger Entry.
  - Use `AccountCode` enum for consistency.
- **Multi-Unit Support:** The system supports "Unit Usaha" (Savings/Loan, Retail, etc.).
  - Retail tables must link to `unit_usaha_id`.
- **Member vs Public:**
  - Retail module supports dual pricing (`price_sell_member` vs `price_sell_public`).
  - Savings payment method available only for Members.
- **Retail POS Alignment (Kopdesa/Smartscoop):**
  - Barcode scanning via scanner modal dan lookup server action.
  - Pembayaran: Tunai, QRIS (dengan polling status), Saldo Simpanan Anggota.
  - Diskon transaksi: mendukung nominal dan persen, dikalkulasi ke `final_amount`.
  - Produk konsinyasi: penandaan visual dan tetap tercatat di transaksi.
  - UI menampilkan harga anggota/umum secara jelas dan konsisten.
- Service: gunakan `PaymentService` untuk mencatat pembayaran dan jurnal.
- **Payment Gateway**:
  - PaymentService (integrasi Midtrans/Xendit)
  - ReconciliationService (auto-match mutasi bank)

## 4. Coding Conventions

- **Naming:** camelCase for variables/functions, PascalCase for components/classes, snake_case for Database columns.
- **Error Handling:** Services should throw errors; UI/Actions should catch and display user-friendly messages.
- **Type Safety:** No `any`. Define interfaces for all DB tables in `src/lib/types/` or service files.

## 5. Directory Structure

- `src/app`: Routes & Pages.
- `src/components`: UI Components (atomic).
- `src/lib/services`: Business Logic classes.
- `src/lib/actions`: Server Actions (form handlers).
- `src/lib/utils`: Helper functions.

## 6. Feature Alignment (Smartscoop & Kopdesa)

- Retail POS
  - Voucher dan Point
  - Discount, Donasi, Split Bill
  - PPN Masukan/Keluaran
  - Stok Opname dan penyesuaian persediaan
  - Barang Konsinyasi
- Simpan Pinjam
  - Produk Simpanan (umum, rencana, berjangka)
  - Autodebet Simpanan Wajib
  - Pembayaran kredit via QRIS
- Master Data
  - Profil Koperasi, Anggota, Pengurus
  - Karyawan, Pelanggan Toko, Aset Barang
  - Pengaturan Email dan Konfigurasi
- Unit Usaha
  - Apotek/Klinik: pasien, layanan, farmasi, pembayaran QRIS/simpanan
  - Gudang/Cold Storage: DO, opname, penimbangan, lelang online
- Pelaporan
  - Konsolidasi laporan per unit usaha ke koperasi
  - Laporan SAK-EP, jurnal otomatis via `LedgerService`
