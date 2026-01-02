'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Activity, Database, ShoppingCart } from 'lucide-react';
import { getTransactionAuditTrail } from '@/app/actions/audit';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export default function InspectorPage() {
    const [trxId, setTrxId] = useState('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!trxId) return;
        setLoading(true);
        setData(null);
        try {
            const result = await getTransactionAuditTrail(trxId);
            setData(result);
        } catch (error: any) {
            toast({
                title: "Not Found",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Audit Inspector</h2>
                <p className="text-muted-foreground">
                    Telusuri jejak digital transaksi secara mendalam (Marketplace, Ledger, Operasional).
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Masukkan Transaction ID atau Reference ID..."
                            value={trxId}
                            onChange={(e) => setTrxId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={() => handleSearch()} disabled={loading}>
                            <Search className="mr-2 h-4 w-4" />
                            {loading ? 'Searching...' : 'Inspect'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {data && (
                <div className="space-y-6">
                    {/* 1. Core State */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Core Engine (Marketplace)</CardTitle>
                            <Activity className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                                <div>
                                    <div className="text-sm text-muted-foreground">ID</div>
                                    <div className="font-mono text-sm">{data.marketplace.id}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Status</div>
                                    <Badge variant={
                                        data.marketplace.status === 'settled' ? 'default' :
                                            data.marketplace.status === 'reversed' ? 'destructive' : 'secondary'
                                    }>
                                        {data.marketplace.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Amount</div>
                                    <div className="font-bold">{formatCurrency(data.marketplace.amount)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Type</div>
                                    <div className="capitalize">{data.marketplace.type}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Ledger Trail */}
                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-medium">Accounting (Ledger)</CardTitle>
                            <Database className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            {data.journals.length === 0 ? (
                                <div className="text-muted-foreground text-sm italic">No journal entries found.</div>
                            ) : (
                                <div className="space-y-4 mt-2">
                                    {data.journals.map((journal: any) => (
                                        <div key={journal.id} className="border rounded-md p-3 text-sm">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-bold">{journal.description}</span>
                                                <span className="text-muted-foreground">{formatDate(journal.transaction_date)}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {journal.journal_lines.map((line: any) => (
                                                    <div key={line.id} className="flex justify-between">
                                                        <span>{line.accounts.code} - {line.accounts.name}</span>
                                                        <div className="flex gap-4 font-mono">
                                                            <span className={line.debit > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                                                                {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                                                            </span>
                                                            <span className={line.credit > 0 ? 'text-red-600' : 'text-muted-foreground'}>
                                                                {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 3. Operational Context */}
                    {data.operational && (
                        <Card className="border-l-4 border-l-orange-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">Operational (POS/PPOB)</CardTitle>
                                <ShoppingCart className="h-5 w-5 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="mt-2 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Invoice</span>
                                        <span className="font-bold">{data.operational.invoice_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Customer</span>
                                        <span>{data.operational.customer_name || 'Guest'}</span>
                                    </div>

                                    {data.operational.pos_transaction_items && (
                                        <div className="mt-4 border-t pt-2">
                                            <div className="text-sm font-semibold mb-2">Items</div>
                                            {data.operational.pos_transaction_items.map((item: any) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.quantity}x Product ID {item.product_id}</span>
                                                    <span>{formatCurrency(item.subtotal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 4. System Logs */}
                    {data.logs.length > 0 && (
                        <Card className="border-l-4 border-l-slate-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">System Logs</CardTitle>
                                <FileText className="h-5 w-5 text-slate-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 mt-2">
                                    {data.logs.map((log: any) => (
                                        <div key={log.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                            <span>{log.action}</span>
                                            <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
