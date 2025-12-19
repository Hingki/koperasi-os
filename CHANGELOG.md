## [Unreleased]
- test: verify git hook works

## [Unreleased]
- fix: resolve lint config and git hook issues

## [Unreleased]
- Test: update changelog hook

## [Unreleased]
- Add CHANGELOG.md template for Koperasi-OS

## [Unreleased]
- Add CHANGELOG.md template for Koperasi-OS

## [Unreleased]
- Add CHANGELOG.md template for Koperasi-OS

# Changelog

Semua perubahan penting pada proyek **Koperasi-OS** akan didokumentasikan di sini.
Format mengikuti Keep a Changelog dan Semantic Versioning.

## [Unreleased]
- Draft fitur baru yang sedang dikembangkan
- Catatan ide atau rencana sprint berikutnya

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






