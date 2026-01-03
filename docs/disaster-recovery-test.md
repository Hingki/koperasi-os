#  DISASTER RECOVERY DRILL (SIMULASI BENCANA)

Dokumen ini adalah panduan teknis untuk memenuhi **Checklist Audit Fase 1 (Critical Blocker)**.
Tujuannya adalah membuktikan bahwa sistem **Koperasi OS** tahan terhadap kehilangan data dan dapat dipulihkan dalam waktu singkat.

**Status Dokumen**: \MANDATORY FOR GO-LIVE\

---

##  Prasyarat (Tools)

Pastikan komputer Anda memiliki:
1.  **PostgreSQL Client Tools** (\pg_dump\ dan \psql\) terinstall dan masuk dalam PATH Environment Variable.
2.  Koneksi internet stabil (karena database berada di Supabase Cloud).
3.  Akses Terminal / Command Prompt.

---

##  Skenario Drill (Langkah-demi-Langkah)

Ikuti langkah ini secara berurutan. Jangan melompat.

### 1. SNAPSHOT (Ambil Backup Terakhir)
Sebelum merusak apapun, kita harus punya titik kembali yang aman.

1.  Buka folder project \C:\koperasi-os\.
2.  Jalankan script backup yang baru dibuat:
    \\\cmd
    scripts\backup-db.bat
    \\\
3.  **Verifikasi**: Cek folder \ackups/\. Pastikan ada file baru, misal \ackup_20250103_120000.sql\. Cek ukurannya (tidak boleh 0 KB).

---

### 2. SIMULASI BENCANA (The Chaos)
Kita akan mensimulasikan "Human Error" fatal, yaitu Admin tidak sengaja menghapus data Anggota penting.

1.  Buka **Supabase SQL Editor** (atau TablePlus/DBeaver).
2.  Pilih satu anggota dummy untuk dikorbankan (Catat ID atau Namanya).
3.  Jalankan Query Penghancur ini:

    \\\sql
    --  BAHAYA: MENGHAPUS DATA MEMBER
    -- Pastikan Anda menghapus data dummy, bukan data riil jika sudah ada.
    
    DELETE FROM member 
    WHERE email LIKE '%@example.com' -- Hapus semua dummy user
    RETURNING id, full_name, email;
    \\\

4.  **Screenshot** hasil query (jumlah baris yang terhapus) sebagai bukti audit.

---

### 3. VERIFIKASI KERUSAKAN (Impact Analysis)
Pastikan sistem benar-benar "rusak" (data hilang).

1.  Buka Aplikasi Koperasi OS (localhost:3000).
2.  Masuk ke menu **Anggota**.
3.  Cari anggota yang tadi dihapus.
4.  **Hasil yang Diharapkan**: Data TIDAK DITEMUKAN. Sistem mungkin error jika mencoba membuka detail simpanan anggota tersebut.

> *Status: BENCANA TERKONFIRMASI. Data hilang.*

---

### 4. RECOVERY (Penyelamatan)
Kita akan mengembalikan sistem ke kondisi Snapshot (Langkah 1).

1.  Buka Terminal di \C:\koperasi-os\.
2.  Ambil nama file backup terakhir dari folder \ackups/\.
3.  Jalankan perintah Restore berikut:

    \\\cmd
    psql "postgresql://postgres:Koperasi2004@db.jppyqrxoswkhlnzuokwm.supabase.co:5432/postgres" -f backups\nama_file_backup_tadi.sql
    \\\
    *(Ganti \
ama_file_backup_tadi.sql\ dengan nama file sebenarnya)*

4.  Tunggu proses selesai. Abaikan warning \ole "postgres" does not exist\ jika muncul (karena flag --no-owner).

---

### 5. VERIFIKASI PULIH (Verification)
Pastikan data sudah kembali.

1.  Buka Aplikasi Koperasi OS lagi.
2.  Refresh halaman **Anggota**.
3.  Cari anggota yang tadi dihapus.
4.  **Hasil yang Diharapkan**: Data MUNCUL KEMBALI dengan status dan saldo yang sama persis seperti sebelum dihapus.

---

##  LEMBAR PERSETUJUAN
Jika Langkah 1-5 berhasil dilakukan tanpa error fatal, tandatangani di bawah ini secara digital.

- **Tanggal Uji Coba**: ____________________
- **Pelaksana**: ____________________
- **Hasil**: [ ] SUKSES / [ ] GAGAL
- **Waktu Recovery**: ______ Menit

---
*Simpan dokumen ini di \docs/audit-logs/\ setelah pengujian selesai sebagai bukti kepatuhan.*
