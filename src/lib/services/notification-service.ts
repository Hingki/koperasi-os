
export class NotificationService {
    /**
     * Send a notification to a user.
     * Currently mocks WhatsApp via Console Log.
     */
    static async sendWhatsApp(phone: string, message: string) {
        // In a real app, this would call Twilio or a WhatsApp Business API
        // For MVP, we log to stdout which is viewable in server logs
        console.log(`[WhatsApp Mock] To: ${phone}`);
        console.log(`[WhatsApp Mock] Body: ${message}`);
        console.log(`[WhatsApp Mock] ----------------------------------------`);
        
        return { success: true, provider: 'mock' };
    }

    static async notifyLoanApproval(memberPhone: string, memberName: string, loanCode: string) {
        const message = `Halo ${memberName}, Pengajuan pinjaman Anda dengan kode ${loanCode} telah DISETUJUI. Silakan cek portal anggota untuk detail pencairan.`;
        return this.sendWhatsApp(memberPhone, message);
    }

    static async notifyLoanRejection(memberPhone: string, memberName: string, loanCode: string) {
        const message = `Halo ${memberName}, Mohon maaf, pengajuan pinjaman Anda dengan kode ${loanCode} belum dapat kami setujui saat ini.`;
        return this.sendWhatsApp(memberPhone, message);
    }

    static async notifyDisbursement(memberPhone: string, memberName: string, amount: number) {
        const fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
        const message = `Halo ${memberName}, Dana sebesar ${fmtAmount} telah dicairkan ke rekening Anda (Tunai/Transfer). Terima kasih.`;
        return this.sendWhatsApp(memberPhone, message);
    }
}
