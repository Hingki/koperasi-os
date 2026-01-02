import { SupabaseClient } from '@supabase/supabase-js';
import { MemberService } from './member-service';
import { WhatsappService } from './whatsapp-service';

export class WhatsappFlowService {
    private memberService: MemberService;
    private whatsappService: WhatsappService;

    constructor(
        private supabase: SupabaseClient,
        whatsappService: WhatsappService
    ) {
        this.memberService = new MemberService(supabase);
        this.whatsappService = whatsappService;
    }

    /**
     * waRegisterMember
     * Input minimal (nama, NIK, no_hp)
     * Output: message_to_user (bahasa manusia)
     * Status selalu PENDING
     */
    async waRegisterMember(data: { name: string; nik: string; phone: string; koperasiId: string }) {
        try {
            // 1. Basic Validation
            if (data.nik.length !== 16) {
                return `Maaf, NIK harus 16 digit. Anda mengirim ${data.nik.length} digit.`;
            }
            if (data.name.length < 3) {
                return `Maaf, Nama terlalu pendek.`;
            }

            // 2. Check existing
            // Note: findMember checks multiple fields, but for registration we specifically check NIK first to avoid dupes.
            // But memberService.register already checks NIK.

            // 3. Register
            // We use a placeholder for address as it's required by schema but not by WA minimal input
            await this.memberService.register({
                koperasi_id: data.koperasiId,
                nama_lengkap: data.name,
                nik: data.nik,
                phone: data.phone,
                alamat_lengkap: 'Pendaftaran via WhatsApp (Belum dilengkapi)',
                member_type: 'regular',
                status: 'pending' // Force pending
            });

            return `Halo ${data.name}, pendaftaran Anda BERHASIL diterima!\n\nStatus: PENDING (Menunggu Verifikasi)\n\nAdmin kami akan memverifikasi data Anda. Mohon tunggu notifikasi selanjutnya.`;

        } catch (error: any) {
            // Handle known errors friendly
            if (error.message.includes('NIK sudah terdaftar')) {
                return `Maaf, NIK ${data.nik} sudah terdaftar di sistem kami. Ketik 'CEK STATUS' untuk melihat status Anda.`;
            }
            console.error('WA Register Error:', error);
            return `Maaf, terjadi kesalahan sistem: ${error.message}. Silakan coba lagi nanti.`;
        }
    }

    /**
     * waCheckStatus
     * Berdasarkan NIK / no_hp
     * Output pesan ramah
     */
    async waCheckStatus(identifier: string, koperasiId: string) {
        try {
            const member = await this.memberService.findMember(identifier, koperasiId);

            if (!member) {
                return `Data dengan identifier "${identifier}" TIDAK DITEMUKAN.\n\nSilakan daftar dengan format: DAFTAR#NAMA#NIK`;
            }

            let message = `Halo ${member.nama_lengkap},\n`;

            switch (member.status) {
                case 'pending':
                    message += `Status: MENUNGGU VERIFIKASI (Pending).\nMohon tunggu persetujuan admin.`;
                    break;
                case 'active':
                    message += `Status: AKTIF ✅\nNomor Anggota: ${member.nomor_anggota}`;
                    break;
                case 'rejected':
                    message += `Status: DITOLAK ❌\nMohon hubungi pengurus koperasi untuk informasi lebih lanjut.`;
                    break;
                default:
                    message += `Status: ${member.status.toUpperCase()}`;
            }

            return message;

        } catch (error: any) {
            console.error('WA Check Status Error:', error);
            return `Maaf, gagal mengecek status. Silakan coba lagi.`;
        }
    }
}
