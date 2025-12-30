'use server';

import { createClient } from '@/lib/supabase/server';
import { resolvePersona } from './core';
import { LogService } from '@/lib/services/log-service';

// Assistant Constitution Reference (FINAL & FROZEN)
// See: /docs/assistant-constitution.md

export type AssistantContext = {
  current_route?: string;
  page_title?: string;
  module_type?: 'savings' | 'loan' | 'retail' | 'accounting';
};

function makeContextPrefix(ctx?: AssistantContext) {
  const moduleLabel = ctx?.module_type === 'savings'
    ? 'Simpanan'
    : ctx?.module_type === 'loan'
      ? 'Pinjaman'
      : ctx?.module_type === 'retail'
        ? 'Retail/POS'
        : 'Akuntansi';
  const title = ctx?.page_title || moduleLabel;
  return `Di halaman ${title} ini, `;
}

const explanationOnly = true;

function explainForPage(ctx?: AssistantContext) {
  const title = ctx?.page_title || '';
  const module: NonNullable<AssistantContext['module_type']> = ctx?.module_type ?? 'accounting';

  const byTitle: Record<string, string> = {
    'Dashboard': 'sistem digunakan untuk menampilkan ringkasan operasional koperasi. Alur kerja bersifat normatif: pengurus memantau indikator utama, lalu membuka modul terkait untuk tindakan administratif. Istilah utama: akses peran pengurus, ringkasan COA, dan status modul tanpa eksekusi finansial.',
    'Jurnal Umum': 'sistem digunakan untuk mencatat jurnal sesuai SAK-EP dalam bentuk entri debit dan kredit yang seimbang. Alur kerja normatif: siapkan akun dari COA, verifikasi periode aktif, dan lakukan posting jurnal tanpa melanggar keseimbangan. Istilah: COA, jurnal, periode, saldo normal (debit/kredit).',
    'Buku Besar': 'sistem digunakan untuk menelusuri saldo dan mutasi setiap akun dari jurnal yang telah diposting. Alur kerja normatif: pilih akun, telaah mutasi, bandingkan saldo dengan laporan. Istilah: ledger, mutasi, saldo akhir, referensi jurnal.',
    'Laporan Keuangan': 'sistem digunakan untuk membaca laporan keuangan yang disusun sesuai SAK-EP (Neraca, Laba Rugi/SHU, Arus Kas). Alur kerja normatif: pilih periode, telaah komponen laporan, pastikan klasifikasi akun tepat. Istilah: aset, liabilitas, ekuitas, pendapatan, beban.',
    'Penutupan Periode': 'sistem digunakan untuk menutup periode akuntansi secara formal. Alur kerja normatif: pastikan semua jurnal telah diposting dan seimbang, lakukan penutupan agar transaksi periode selesai dan menyiapkan saldo awal periode berikut. Istilah: periode, posting, saldo awal, penutupan.',
    'Saldo Awal': 'sistem digunakan untuk menyiapkan saldo awal akun saat membuka periode baru. Alur kerja normatif: setel saldo awal berdasarkan keputusan sebelumnya, pastikan konsistensi klasifikasi akun. Istilah: saldo awal, periode pembukaan, klasifikasi akun.',
    'Simpanan': 'sistem digunakan untuk administrasi simpanan anggota (wajib, sukarela) secara terpisah dari pengambilan keputusan. Alur kerja normatif: meninjau status simpanan dan keterkaitan dengan periode. Istilah: simpanan wajib, simpanan sukarela, anggota.',
    'Pinjaman': 'sistem digunakan untuk administrasi pinjaman anggota, termasuk penjelasan angsuran, bunga, dan status tanpa rekomendasi. Alur kerja normatif: tinjau status pinjaman dan jadwal. Istilah: pokok, bunga, angsuran, jatuh tempo.',
    'Retail/POS': 'sistem digunakan untuk operasional retail/POS dalam kerangka akuntansi yang tertib. Alur kerja normatif: input transaksi penjualan dan kas sesuai prosedur, kemudian referensi jurnal. Istilah: penjualan, kas masuk/keluar, stok, referensi jurnal.',
    'Kas Awal': 'sistem digunakan untuk menetapkan kas awal operasional teller. Alur kerja normatif: tentukan nominal operasional, dokumentasikan status tanpa melakukan transaksi finansial. Istilah: kas awal, operasional teller.',
    'Kas Masuk': 'sistem digunakan untuk mencatat arus kas masuk operasional teller secara administratif. Alur kerja normatif: dokumentasi kas masuk, sinkron dengan periode. Istilah: kas masuk, operasional.',
    'Kas Keluar': 'sistem digunakan untuk mencatat arus kas keluar operasional teller secara administratif. Alur kerja normatif: dokumentasi kas keluar, sinkron dengan periode. Istilah: kas keluar, operasional.',
    'Validasi Transaksi': 'sistem digunakan untuk validasi transaksi operasional sebelum tercermin pada pelaporan. Alur kerja normatif: periksa kelengkapan dan konsistensi administratif. Istilah: validasi, referensi transaksi.',
    'Tutup Kas Harian': 'sistem digunakan untuk penutupan kas harian teller. Alur kerja normatif: rekonsiliasi kas operasional harian, konfirmasi status penutupan. Istilah: rekonsiliasi kas, penutupan harian.',
    'Website CMS': 'sistem digunakan untuk pengelolaan konten publik koperasi. Alur kerja normatif: kelola halaman dan informasi tanpa keterkaitan langsung dengan data finansial. Istilah: konten, publikasi.',
    'Audit Log': 'sistem digunakan untuk meninjau jejak aktivitas sistem demi transparansi. Alur kerja normatif: telaah event log dan akses administratif. Istilah: audit, aktivitas sistem.',
  };

  const prefix = makeContextPrefix(ctx);
  if (byTitle[title]) return `${prefix}${byTitle[title]}`;

  const byModule: Record<NonNullable<AssistantContext['module_type']>, string> = {
    accounting: 'sistem digunakan untuk administrasi dan pembacaan laporan sesuai SAK-EP. Alur kerja normatif: siapkan COA, posting jurnal yang seimbang, dan baca laporan periode. Istilah: COA, jurnal, periode, saldo normal.',
    savings: 'sistem digunakan untuk administrasi simpanan anggota secara formal tanpa keputusan finansial. Alur kerja normatif: meninjau status simpanan dan periode. Istilah: simpanan wajib, simpanan sukarela.',
    loan: 'sistem digunakan untuk administrasi pinjaman anggota tanpa rekomendasi. Alur kerja normatif: meninjau jadwal dan status angsuran. Istilah: pokok, bunga, angsuran.',
    retail: 'sistem digunakan untuk operasional penjualan dan kas dalam kerangka akuntansi tertib. Alur kerja normatif: dokumentasi transaksi dan referensi jurnal. Istilah: penjualan, kas masuk/keluar, stok.',
  };

  return `${prefix}${byModule[module]}`;
}

export async function askPANDU(question: string, ctx?: AssistantContext): Promise<{ answer: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { answer: 'Silakan login untuk menggunakan PANDU.' };

  const persona = await resolvePersona();
  if (persona !== 'PANDU') return { answer: 'Akses terbatas: PANDU hanya untuk Pengurus & Pengawas.' };

  const q = (question || '').toLowerCase();
  const prefix = makeContextPrefix(ctx);

  const logService = new LogService(supabase);
  await logService.log({
    action_type: 'SYSTEM',
    action_detail: 'ASSISTANT_INVOCATION',
    status: 'SUCCESS',
    user_id: user.id,
    user_role: 'admin',
    metadata: { assistant: 'PANDU', route: ctx?.current_route, page_title: ctx?.page_title }
  });

  if (explanationOnly) {
    const explanation = explainForPage(ctx);
    return { answer: explanation };
  }

  if (q.includes('tutup periode') || q.includes('closing period')) {
    return { answer: prefix + 'dampak penutupan periode adalah: 1) Membekukan transaksi pada periode berjalan, 2) Membuat snapshot saldo awal periode berikutnya, 3) Mencegah modifikasi jurnal pada periode yang ditutup. Pastikan semua jurnal telah diposting dan seimbang (Double-Entry) sebelum penutupan. Penutupan tidak mengubah data keuangan, hanya status periode. Ikuti SOP: rekonsiliasi, review COA, post semua jurnal, lalu tutup periode.' };
  }

  if (q.includes('neraca') || q.includes('balance sheet')) {
    return { answer: prefix + 'Neraca menjelaskan posisi keuangan: Aset = Liabilitas + Ekuitas. Periksa saldo normal: Aset/Beban (Debit), Liabilitas/Ekuitas/Pendapatan (Kredit). Untuk analisis, fokus pada likuiditas (Kas/Bank), kewajiban jangka pendek, dan ekuitas tahun berjalan.' };
  }

  if (q.includes('shu') || q.includes('laba rugi') || q.includes('income statement')) {
    return { answer: prefix + 'Laporan Laba Rugi/SHU: Pendapatan - Beban = SHU. Pastikan pengakuan periode sesuai SAK-EP. Gunakan COA yang tepat untuk pendapatan usaha, beban operasional, dan pendapatan/beban lain-lain. SHU tidak boleh dihitung dari transaksi non-operasional tanpa klasifikasi yang benar.' };
  }

  if (q.includes('arus kas') || q.includes('cash flow')) {
    return { answer: prefix + 'Arus Kas: Operasi, Investasi, Pendanaan. Analisis kas masuk/keluar dari jurnal yang diposting. Hindari ketergantungan pada saldo akun tanpa melihat aktivitas. Untuk risiko operasional, awasi kas kecil, setoran bank, dan pembayaran pinjaman.' };
  }

  if (q.includes('log') || q.includes('error') || q.includes('pilot')) {
    return { answer: prefix + 'ringkasan log & error dapat dilihat di Dashboard → Digital & System → Pilot Monitor. PANDU bersifat read-only: gunakan halaman tersebut untuk observasi tanpa mengubah data.' };
  }

  // Default scoped hint sesuai modul
  const scoped = ctx?.module_type === 'savings'
    ? 'tanyakan tentang jurnal simpanan (setoran/penarikan), saldo awal, atau rekonsiliasi.'
    : ctx?.module_type === 'loan'
      ? 'tanyakan tentang jurnal angsuran, bunga, penalti, atau penutupan pinjaman.'
      : ctx?.module_type === 'retail'
        ? 'tanyakan tentang jurnal penjualan, kas masuk/keluar, dan stok.'
        : 'tanyakan tentang penutupan periode, Neraca, SHU, atau Arus Kas.';
  return { answer: prefix + scoped };
}

export async function askTUNTUN(question: string, ctx?: AssistantContext): Promise<{ answer: string, disclaimer: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { answer: 'Silakan login untuk menggunakan TUNTUN.', disclaimer: 'Aku tidak memberi saran keuangan, tapi bisa bantu memahami pilihanmu.' };

  const persona = await resolvePersona();
  if (persona !== 'TUNTUN') return { answer: 'TUNTUN hanya tampil untuk anggota. Gunakan area anggota.', disclaimer: 'Aku tidak memberi saran keuangan, tapi bisa bantu memahami pilihanmu.' };

  const q = (question || '').toLowerCase();
  const prefix = makeContextPrefix(ctx);
  const disclaimer = 'Aku tidak memberi saran keuangan, tapi bisa bantu memahami pilihanmu.';

  const logService = new LogService(supabase);
  await logService.log({
    action_type: 'SYSTEM',
    action_detail: 'ASSISTANT_INVOCATION',
    status: 'SUCCESS',
    user_id: user.id,
    user_role: 'member',
    metadata: { assistant: 'TUNTUN', route: ctx?.current_route, page_title: ctx?.page_title }
  });

  if (q.includes('simpanan wajib')) {
    return { answer: prefix + 'Simpanan Wajib: setoran rutin bulanan sesuai ketentuan koperasi. Manfaat: membangun modal koperasi; risiko: tidak fleksibel ditarik saat aktif. Biasanya tidak boleh diambil hingga berhenti keanggotaan.', disclaimer };
  }

  if (q.includes('simpanan sukarela')) {
    return { answer: prefix + 'Simpanan Sukarela: setoran fleksibel, bisa ditambah atau ditarik sesuai aturan koperasi. Manfaat: fleksibilitas dan potensi bunga; risiko: bunga tidak dijamin dan mengikuti kebijakan RAT.', disclaimer };
  }

  if (q.includes('shu') || q.includes('sisa hasil usaha')) {
    return { answer: prefix + 'SHU: selisih pendapatan dan beban koperasi. Pembagian mengikuti AD/ART dan keputusan RAT (misalnya: jasa anggota, cadangan, dana pendidikan, dll). Bagian anggota biasanya bergantung pada partisipasi: belanja di unit usaha, simpanan, dan pinjaman.', disclaimer };
  }

  // Strict mode: tidak ada simulasi atau angka

  const scoped = ctx?.module_type === 'savings'
    ? 'TUNTUN bisa jelaskan Simpanan Wajib/Sukarela dan hal yang ingin kamu pahami.'
    : ctx?.module_type === 'accounting'
      ? 'TUNTUN bisa jelaskan SHU dan cara pembagian di RAT.'
      : 'TUNTUN bisa bantu memahami fitur yang sedang kamu lihat.';
  return { answer: prefix + scoped, disclaimer };
}
