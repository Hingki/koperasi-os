'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Truck } from 'lucide-react';
import { POSTransaction } from '@/lib/services/retail-service';

export function DeliveryList({ transactions }: { transactions: any[] }) {
    const handlePrintDO = (tx: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const date = new Date(tx.transaction_date).toLocaleString('id-ID');
        const itemsHtml = tx.items?.map((item: any) => `
            <tr>
                <td style="padding: 5px; border-bottom: 1px solid #ddd;">${item.product?.name || 'Item'}</td>
                <td style="padding: 5px; border-bottom: 1px solid #ddd;">${item.quantity} ${item.product?.unit || 'pcs'}</td>
                <td style="padding: 5px; border-bottom: 1px solid #ddd;">-</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Surat Jalan - ${tx.invoice_number}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th { text-align: left; background: #f0f0f0; padding: 10px; border-bottom: 1px solid #000; }
                        .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
                        .sig-box { text-align: center; width: 200px; }
                        .sig-line { margin-top: 60px; border-top: 1px solid #000; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>SURAT JALAN (DELIVERY ORDER)</h2>
                        <p>No: DO-${tx.invoice_number}</p>
                        <p>Tanggal: ${date}</p>
                    </div>
                    
                    <div style="margin-bottom: 30px;">
                        <strong>Kepada Yth:</strong><br>
                        ${tx.customer_name || 'Pelanggan Umum'}<br>
                        ${tx.delivery_address || ''}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Nama Barang</th>
                                <th>Qty</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="signatures">
                        <div class="sig-box">
                            <p>Penerima</p>
                            <div class="sig-line">Nama Jelas</div>
                        </div>
                        <div class="sig-box">
                            <p>Pengirim / Gudang</p>
                            <div class="sig-line">Petugas Gudang</div>
                        </div>
                        <div class="sig-box">
                            <p>Mengetahui</p>
                            <div class="sig-line">Manager Operasional</div>
                        </div>
                    </div>
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-4">
            {transactions.map((tx) => (
                <Card key={tx.id}>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="font-bold">{tx.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">{new Date(tx.transaction_date).toLocaleString('id-ID')}</p>
                            <p className="text-sm mt-1">Pelanggan: {tx.customer_name || 'Umum'}</p>
                        </div>
                        <div className="flex gap-2">
                             {/* Placeholder for status update */}
                             <Button variant="outline" size="sm">
                                <Truck className="mr-2 h-4 w-4" />
                                Update Status
                            </Button>
                            <Button onClick={() => handlePrintDO(tx)} size="sm">
                                <Printer className="mr-2 h-4 w-4" />
                                Cetak Surat Jalan
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
