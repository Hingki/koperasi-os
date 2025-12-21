# Changelog

Semua perubahan penting pada proyek **Koperasi-OS** akan didokumentasikan di sini.
Format mengikuti Keep a Changelog dan Semantic Versioning.

## [Unreleased]
### Added
- **Full Dashboard Implementation**:
  - **Retail Module**: Suppliers, Products, Purchases, POS (Point of Sale).
  - **Loans Module**: Loan application, approval workflow, active loan management.
  - **Accounting Module**: Balance Sheet, Income Statement, Cash Flow (with Tailwind styling).
  - **Settings Module**: Koperasi profile management with auto-linking to user metadata.
- **System Stability & Validation**:
  - Implemented consistent UUID validation (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) across all pages.
  - Added `koperasi_id` filtering to all database queries to ensure data isolation and performance.
  - Enhanced server actions with robust error handling and type safety.
  - Added `getIndentClass` helper to replace inline styles in reports.

### Fixed
- **Critical Bugs**:
  - Resolved "22P02" invalid input syntax for UUID errors on loan and settings pages.
  - Fixed `net::ERR_ABORTED` errors on `/dashboard/settings` and `/dashboard/members` due to slow rendering/unfiltered queries.
  - Fixed "ERR_EMPTY_RESPONSE" server crashes by implementing defensive coding patterns.
- **Improvements**:
  - Fixed TypeScript errors in form actions (`reviewLoanApplicationAction`).
  - Resolved "CSS inline styles should not be used" warnings.
  - Optimized database queries to reduce server strain.

## [v6.1.0] - 2025-12-20
### Added
- Integrasi penuh idempotent SQL (ENUM, tabel, trigger, index, constraint, foreign key)
- File rollback.sql untuk reset database dan recovery cepat
- Test harness untuk audit RLS (Row Level Security)
- Dokumentasi onboarding.md untuk contributor baru di Cursor IDE

### Changed
- Struktur folder: src/, migrations/, tests/, docs/
- Penyesuaian .gitignore agar credential .env tidak ikut ter-track
- Update README.md dengan instruksi setup & recovery

### Fixed
- Perbaikan error pada migrasi ENUM ganda
- Resolusi konflik branch dev vs main dengan merge aman

## [v6.0.0] - 2025-11-30
### Added
- Modul simpan pinjam koperasi
- Template CHANGELOG.md untuk dokumentasi sprint
- Script supabase migration list untuk verifikasi migrasi

### Changed
- Penyesuaian struktur database sesuai RK-RAPB 2024
- Update branding koperasi-OS di README.md

### Fixed
- Bug akses anggota non-otorisasi pada RLS
