# Persyaratan Integrasi BRIVA (BRI Virtual Account)

Untuk mengintegrasikan fitur pembayaran otomatis via BRIVA, Koperasi perlu menyiapkan hal-hal berikut:

## 1. Administratif
*   **Rekening Giro BRI**: Koperasi wajib memiliki rekening giro di Bank BRI.
*   **Pendaftaran CMS (Cash Management System)**: Mendaftar layanan CMS BRI.
*   **Perjanjian Kerjasama (PKS)**: Menandatangani PKS layanan BRIVA dengan pihak BRI.

## 2. Teknis (API Credentials)
Setelah pendaftaran disetujui, BRI akan memberikan kredensial untuk akses API (biasanya via BRIAPI Developer Portal):
*   **Consumer Key**: Client ID untuk autentikasi.
*   **Consumer Secret**: Client Secret untuk autentikasi.
*   **Institution Code**: Kode unik institusi koperasi.
*   **Briva No**: Kode prefix VA (biasanya 5 digit, misal 77777).

## 3. Alur Integrasi Sistem
1.  **Generate VA**: 
    -   Format: `[Briva No] + [Nomor Unik Anggota/Transaksi]`
    -   Contoh: `77777` + `081234567890` (No HP) atau `00001` (ID Anggota).
2.  **API Create VA**: Sistem Koperasi memanggil API BRI untuk mendaftarkan VA baru (amount bisa open/fix).
3.  **Callback / Webhook**: BRI akan memanggil URL endpoint di Sistem Koperasi saat ada pembayaran masuk (Notifikasi Real-time).
4.  **Inquiry**: Sistem Koperasi dapat mengecek status pembayaran VA secara aktif.

## 4. Rencana Implementasi di KoperasiOS
*   [ ] Buat tabel `briva_config` untuk menyimpan credentials (terenkripsi).
*   [ ] Buat modul `BrivaService` untuk handle API calls (Get Token, Create VA, Inquiry).
*   [ ] Buat API Endpoint `/api/webhooks/briva` untuk menerima callback dari BRI.
*   [ ] Update `PaymentSource` dengan provider `briva`.

## Catatan
Saat ini sistem menggunakan **Transfer Manual** dengan verifikasi admin sebagai langkah awal sebelum migrasi ke host-to-host BRIVA.
