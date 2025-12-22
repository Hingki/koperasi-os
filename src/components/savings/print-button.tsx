'use client';

import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface PrintButtonProps {
    title: string;
    type: 'book' | 'mutation';
    data: {
        account: any;
        transactions: any[];
    };
    icon?: ReactNode;
}

export function PrintButton({ title, type, data, icon }: PrintButtonProps) {
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const { account, transactions } = data;
        const date = new Date().toLocaleString('id-ID');

        const rows = transactions.map(tx => `
            <tr>
                <td>${new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                <td>${tx.id.slice(0, 8)}</td>
                <td>${tx.description || '-'}</td>
                <td style="text-align: right; color: ${tx.type === 'deposit' ? 'green' : 'red'}">
                    ${tx.type === 'deposit' ? '+' : '-'}${new Intl.NumberFormat('id-ID').format(Math.abs(tx.amount))}
                </td>
                <td style="text-align: right;">${new Intl.NumberFormat('id-ID').format(tx.balance_after)}</td>
            </tr>
        `).join('');

        const content = `
            <html>
            <head>
                <title>${title} - ${account.account_number}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .info-item { margin-bottom: 10px; }
                    .label { color: #666; font-size: 0.9em; }
                    .value { font-weight: bold; }
                    table { w-full: 100%; width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 0.9em; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    @media print {
                        @page { margin: 2cm; }
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>KOPERASI</h2>
                    <h3>${title.toUpperCase()}</h3>
                    <p>Tanggal Cetak: ${date}</p>
                </div>

                <div class="info-grid">
                    <div>
                        <div class="info-item">
                            <div class="label">Nomor Rekening</div>
                            <div class="value">${account.account_number}</div>
                        </div>
                        <div class="info-item">
                            <div class="label">Produk Simpanan</div>
                            <div class="value">${account.product?.name}</div>
                        </div>
                    </div>
                    <div>
                        <div class="info-item">
                            <div class="label">Nama Anggota</div>
                            <div class="value">${account.member?.nama_lengkap}</div>
                        </div>
                        <div class="info-item">
                            <div class="label">Nomor Anggota</div>
                            <div class="value">${account.member?.nomor_anggota}</div>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Kode</th>
                            <th>Keterangan</th>
                            <th style="text-align: right;">Jumlah</th>
                            <th style="text-align: right;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <Button variant="outline" size="sm" onClick={handlePrint}>
            {icon}
            {title}
        </Button>
    );
}
