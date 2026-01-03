# ALUR MANUAL KOPERASI VS SISTEM DIGITAL (KONTRAK REALITAS)

Dokumen ini menjelaskan transisi dari proses manual ke sistem Koperasi OS v1. Dokumen ini berfungsi sebagai "Kontrak Realitas" untuk memastikan bahwa sistem digital yang dibangun benar-benar mengakomodasi atau meningkatkan proses operasional yang ada.

---

##  KEBIJAKAN RESMI: PAPERLESS & DIGITAL-ONLY

Koperasi OS menerapkan kebijakan operasional **Tanpa Kertas (Zero-Paper)**.

Seluruh proses operasional (Registrasi, Transaksi, Persetujuan, Laporan) dilakukan sepenuhnya melalui Sistem Digital (Web/App).

Bagian **"Alur Konvensional"** di bawah ini disajikan **hanya sebagai bahan referensi** agar pengurus memahami perbedaan mendasar antara cara koperasi lama vs cara kita sekarang. Langkah-langkah fisik (formulir, stempel, buku tulis) **TIDAK DILAKUKAN** dan digantikan sepenuhnya oleh Alur Digital.

---

## 1. MODUL ANGGOTA

### Alur Konvensional (Untuk Referensi - TIDAK DITERAPKAN)
1. Calon anggota datang ke sekretariat koperasi.
2. Mengisi Formulir Pendaftaran secara tertulis (Nama, NIK, Alamat).
3. Menyerahkan fotokopi KTP/KK.
4. Petugas admin mencatat data di Buku Induk Anggota (buku tulis fisik).
5. Pengurus memberikan Nomor Anggota secara manual (urutan kedatangan).
6. Calon anggota bayar Simpanan Pokok tunai.
7. Bendahara beri tanda terima kertas kwitansi.

### Alur Digital (System)
*(Berdasarkan analisa kode src/lib/services/member-service.ts)*

1.  **Registrasi Mandiri/Admin**: Data calon anggota diinput ke sistem (NIK, Nama, Alamat, Tipe Anggota).
    *   *Validasi Sistem*: NIK dicek otomatis agar tidak ada duplikasi.
    *   *Status Awal*: Pending.
2.  **Verifikasi Pengurus**: Admin/Pengurus membuka menu Approval.
3.  **Aktivasi & Penomoran Otomatis**:
    *   Saat tombol "Approve" diklik, sistem otomatis men-generate **Nomor Anggota** dengan format baku: [KODE_KOPERASI]-[TIPE]-[TAHUN]-[URUT].
    *   Status berubah menjadi Active.
    *   Tanggal bergabung (pproved_at) tercatat presisi detik itu juga.

### Pain Point Manual yang Diselesaikan
*   Risiko duplikasi nomor anggota atau NIK ganda.
*   Kehilangan formulir fisik pendaftaran.
*   Kesulitan mencari data anggota (harus buka buku induk fisik).

---

## 2. MODUL SIMPANAN

### Alur Konvensional (Untuk Referensi - TIDAK DITERAPKAN)
1. Anggota datang dengan uang tunai.
2. Bendahara tulis di Buku Kas Harian.
3. Bendahara tulis di Buku Passbook anggota.
4. Bendahara serahkan Kwitansi kertas sederhana.
5. Uang disimpan di brankas fisik.
6. Akhir bulan dihitung ulang pakai kalkulator.

### Alur Digital (System)
*(Berdasarkan analisa kode src/lib/services/savings-service.ts)*

1.  **Input Transaksi**: Teller memilih anggota dan jenis transaksi (Setoran/Penarikan).
2.  **Validasi Otomatis**:
    *   Sistem mengecek aturan produk (misal: Setoran Minimum, Saldo Mengendap).
    *   Jika Penarikan, sistem memastikan saldo mencukupi secara real-time.
3.  **Ledger-First Architecture (Jurnal Dulu, Baru Saldo)**:
    *   Sebelum saldo berubah, sistem **mencatat Jurnal Akuntansi** terlebih dahulu (Debit Kas / Kredit Simpanan).
    *   Jika jurnal gagal (misal periode akuntansi dikunci), transaksi ditolak. Ini menjamin akurasi uang vs catatan.
4.  **Update Real-time**: Saldo anggota langsung terupdate dan terlihat di dashboard anggota maupun admin.
5.  **Bukti Transaksi**: ID Transaksi unik terbentuk sebagai referensi audit.

### Pain Point Manual yang Diselesaikan
*   Selisih saldo antara Buku Anggota dan Buku Kas Bendahara.
*   Kesalahan hitung manual saat penambahan/pengurangan saldo.
*   Transaksi tidak tercatat di pembukuan (lupa catat).

---

## 3. MODUL PINJAMAN

### Alur Konvensional (Untuk Referensi - TIDAK DITERAPKAN)
1. Anggota isi formulir pengajuan kertas.
2. Pengurus rapat/verifikasi manual.
3. Bendahara hitung bunga & angsuran pakai kalkulator/Excel.
4. Buat Surat Perjanjian kertas.
5. Tanda tangan basah (wet signature).
6. Bendahara kasih uang tunai.
7. Jadwal angsuran dicoret manual di kertas.

### Alur Digital (System)
*(Berdasarkan analisa kode src/lib/services/loan-service.ts)*

1.  **Pengajuan (Application)**:
    *   Input jumlah dan tenor.
    *   Validasi plafon produk dan maksimal tenor oleh sistem.
    *   Status: Submitted.
2.  **Review & Approval**:
    *   Pengurus mereview data.
    *   Input keputusan (Approved/Rejected) beserta catatan review.
3.  **Pencairan (Disbursement)**:
    *   Sistem memposting Jurnal Pencairan (Debit Piutang, Kredit Kas) secara otomatis.
    *   Status Pinjaman menjadi Active.
4.  **Generate Jadwal Angsuran**:
    *   Sistem otomatis menghitung bunga (Flat/Efektif sesuai produk).
    *   Tabel jadwal pembayaran (Pokok + Bunga) dibuat instan dan tersimpan di database.

### Pain Point Manual yang Diselesaikan
*   Kesalahan perhitungan bunga dan total angsuran.
*   Lupa menagih karena tidak ada jadwal yang terpusat.
*   Risiko piutang tidak tercatat di neraca.

---

## 4. MODUL AKUNTANSI & LAPORAN

### Alur Konvensional (Untuk Referensi - TIDAK DITERAPKAN)
1. Kumpulkan semua nota/kwitangan sebulan.
2. Input manual ke Buku Besar atau Excel.
3. Rekapitulasi kas vs catatan manual.
4. Cari selisih jika uang tidak pas.
5. Buat Laporan Neraca & SHU manual.
6. Cetak untuk tanda tangan Pengawas.

### Alur Digital (System)
*(Berdasarkan analisa kode src/lib/services/accounting-service.ts)*

1.  **Otomatisasi Jurnal (Auto-Journaling)**:
    *   Tidak perlu input jurnal manual untuk transaksi operasional (Simpan/Pinjam). Sistem service (AccountingService) menangani ini di background.
    *   Prinsip **Double Entry** (Debit = Kredit) dijaga ketat oleh sistem.
2.  **Single Source of Truth**:
    *   Laporan Keuangan (Neraca, Laba Rugi/SHU) diambil langsung dari data jurnal yang sama dengan data operasional. Tidak ada dua pembukuan.
3.  **Real-time Reporting**:
    *   Neraca Saldo (Trial Balance) bisa dilihat kapan saja tanpa menunggu tutup buku akhir bulan.
    *   Posisi Kas dan Aset terupdate detik itu juga setelah transaksi terjadi.

### Pain Point Manual yang Diselesaikan
*   Laporan Neraca tidak *balance* (seimbang) dan sulit mencari selisihnya.
*   Keterlambatan penyajian laporan keuangan kepada anggota/pengawas.
*   Manipulasi data laporan karena pencatatan terpisah dari operasional.

---

**CATATAN UNTUK PENGURUS:**
*   Bagian **"Alur Konvensional"** harap diisi oleh Ketua/Bendahara berdasarkan pengalaman riil sebelum ada sistem.
*   Bagian **"Alur Digital"** adalah fakta teknis cara kerja sistem saat ini.
*   Jika Alur Digital dirasa menyulitkan atau tidak sesuai regulasi koperasi, harap segera laporkan ke Tim Developer sebelum *Go-Live*.
