'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintLoanButtonProps {
    title?: string;
    data: any; // The loan object with repayments
}

export function PrintLoanButton({ title = "Cetak Kartu", data }: PrintLoanButtonProps) {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow popups to print");
            return;
        }

        const loan = data;
        const member = loan.member;
        const product = loan.product;
        const activeLoan = loan.loans?.[0]; // Get the active loan record
        const schedule = activeLoan?.repayments?.sort((a: any, b: any) => a.installment_number - b.installment_number) || [];

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Kartu Angsuran - ${member.nama_lengkap}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 800px; mx-auto; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
                    .title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
                    .subtitle { font-size: 12px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 12px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
                    th { background-color: #f0f0f0; }
                    .text-right { text-align: right; }
                    .footer { margin-top: 30px; font-size: 10px; text-align: center; }
                    @media print {
                        @page { size: A4; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">KOPERASI MITRA SEJAHTERA</div>
                    <div class="subtitle">KARTU ANGSURAN PINJAMAN</div>
                </div>

                <div class="info-grid">
                    <div>
                        <strong>Nama Anggota:</strong> ${member.nama_lengkap}<br>
                        <strong>No. Anggota:</strong> ${member.nomor_anggota}<br>
                        <strong>Jenis Pinjaman:</strong> ${product.name}
                    </div>
                    <div style="text-align: right;">
                        <strong>No. Pinjaman:</strong> ${activeLoan?.account_number || '-'}<br>
                        <strong>Tanggal Cair:</strong> ${new Date(loan.disbursed_at || Date.now()).toLocaleDateString('id-ID')}<br>
                        <strong>Plafond:</strong> Rp ${new Intl.NumberFormat('id-ID').format(loan.amount)}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Ke</th>
                            <th>Jatuh Tempo</th>
                            <th class="text-right">Pokok</th>
                            <th class="text-right">Bunga</th>
                            <th class="text-right">Total</th>
                            <th>Status</th>
                            <th>Tgl Bayar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedule.map((item: any) => `
                            <tr>
                                <td style="text-align: center;">${item.installment_number}</td>
                                <td>${new Date(item.due_date).toLocaleDateString('id-ID')}</td>
                                <td class="text-right">${new Intl.NumberFormat('id-ID').format(item.amount_principal)}</td>
                                <td class="text-right">${new Intl.NumberFormat('id-ID').format(item.amount_interest)}</td>
                                <td class="text-right">${new Intl.NumberFormat('id-ID').format(item.amount_total)}</td>
                                <td style="text-align: center;">${item.status === 'paid' ? 'LUNAS' : item.status === 'overdue' ? 'TELAT' : 'BELUM'}</td>
                                <td>${item.paid_at ? new Date(item.paid_at).toLocaleDateString('id-ID') : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    Dicetak pada: ${new Date().toLocaleString('id-ID')}<br>
                    Dokumen ini sah dan di-generate oleh sistem.
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    return (
        <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            {title}
        </Button>
    );
}
