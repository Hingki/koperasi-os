'use server';

import { createClient } from '@/lib/supabase/server';
import { MemberService } from '@/lib/services/member-service';
import { z } from 'zod';

const waRegisterSchema = z.object({
  waNumber: z.string().min(10),
  nama: z.string().min(3),
  nik: z.string().length(16),
  koperasiId: z.string().uuid()
});

/**
 * Server Action for WhatsApp Bot to Register Member
 * Protected by API Key (conceptually) or just standard server action security
 */
export async function waRegisterMember(payload: z.infer<typeof waRegisterSchema>) {
  const supabase = await createClient();
  // Note: In a real WA Bot scenario, we might use a Service Role client 
  // if the request comes from a verified bot server. 
  // For now, we assume this action is called by an authenticated context or we adapt it.

  // IF this is called by an external bot via API Route, the API Route will handle auth.
  // Here we just use the Service Logic.

  const memberService = new MemberService(supabase);

  try {
    const validated = waRegisterSchema.parse(payload);
    const member = await memberService.registerFromWA(validated);

    // Friendly Success Message
    const message = `Terima kasih! Data pendaftaran Anda telah kami terima.\n\n` +
      `Nama: ${member.nama_lengkap}\n` +
      `NIK: ${member.nik}\n` +
      `Status: MENUNGGU PERSETUJUAN (PENDING)\n\n` +
      `Admin kami akan segera memverifikasi data Anda. Mohon tunggu notifikasi selanjutnya.`;

    return {
      success: true,
      data: {
        memberId: member.id,
        status: member.status,
        message_to_user: message
      }
    };
  } catch (error: any) {
    // Friendly Error Handling
    let userMessage = "Maaf, terjadi kesalahan pada sistem kami. Silakan coba beberapa saat lagi.";

    if (error.message.includes('sudah terdaftar')) {
      userMessage = `Mohon maaf, data Anda (NIK/WA) sudah terdaftar dalam sistem.\n\n` +
        `Silakan ketik *CEK STATUS* untuk melihat status keanggotaan Anda.`;
    }

    return { success: false, error: error.message, message_to_user: userMessage };
  }
}

export async function waCheckStatus(waNumber: string, koperasiId: string) {
  const supabase = await createClient();
  const memberService = new MemberService(supabase);

  try {
    const status = await memberService.getMemberStatus(waNumber, koperasiId);

    if (!status) {
      return {
        success: false,
        error: 'Member not found',
        message_to_user: `Nomor WhatsApp ${waNumber} belum terdaftar di sistem kami.\n\nSilakan lakukan pendaftaran terlebih dahulu.`
      };
    }

    // Friendly Status Messages based on State
    let message = "";
    if (status.status === 'active') {
      message = `Selamat Pagi/Siang/Sore, ${status.nama}!\n\n` +
        `Status Keanggotaan: ✅ AKTIF\n` +
        `Nomor Anggota: *${status.nomor_anggota}*\n` +
        `Tanggal Bergabung: ${new Date(status.join_date).toLocaleDateString('id-ID')}\n\n` +
        `Terima kasih telah menjadi bagian dari koperasi kami.`;
    } else if (status.status === 'pending') {
      message = `Halo, ${status.nama}.\n\n` +
        `Status pendaftaran Anda saat ini: ⏳ MENUNGGU PERSETUJUAN (PENDING)\n\n` +
        `Data Anda sedang diverifikasi oleh tim admin kami. Mohon kesediaannya untuk menunggu.`;
    } else {
      message = `Halo, ${status.nama}.\n\n` +
        `Status keanggotaan Anda saat ini: ⚠️ ${status.status.toUpperCase()}\n\n` +
        `Silakan hubungi admin untuk informasi lebih lanjut.`;
    }

    return { success: true, data: { ...status, message_to_user: message } };

  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message_to_user: "Maaf, terjadi gangguan saat mengecek status. Silakan coba lagi nanti."
    };
  }
}
