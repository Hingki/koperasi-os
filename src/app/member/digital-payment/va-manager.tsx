
'use client';

import { useState } from 'react';
import { createSavingsVA, createLoanVA } from '@/lib/actions/digital-payment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Copy, CreditCard, Banknote } from 'lucide-react';
import { Account } from '../../../lib/types/savings';

interface VAProps {
    accounts: Account[];
    loans: any[];
    existingVAs: any[];
}

export function VirtualAccountManager({ accounts, loans, existingVAs }: VAProps) {
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [selectedLoan, setSelectedLoan] = useState<string>('');
    const [selectedBank, setSelectedBank] = useState<string>('BCA');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleCreateSavingsVA = async () => {
        if (!selectedAccount) return;
        setLoading(true);
        const res = await createSavingsVA(selectedAccount, selectedBank);
        setLoading(false);
        handleResponse(res);
    };

    const handleCreateLoanVA = async () => {
        if (!selectedLoan) return;
        setLoading(true);
        const res = await createLoanVA(selectedLoan, selectedBank);
        setLoading(false);
        handleResponse(res);
    };

    const handleResponse = (res: any) => {
        if (res.success) {
            toast({ title: 'Virtual Account Berhasil Dibuat', description: 'Silakan gunakan nomor VA untuk transaksi.' });
        } else {
            toast({ variant: 'destructive', title: 'Gagal', description: res.error });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Disalin', description: 'Nomor VA disalin ke clipboard.' });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Buat Virtual Account Baru</CardTitle>
                    <CardDescription>Pilih jenis transaksi dan bank tujuan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="savings" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="savings">Topup Simpanan</TabsTrigger>
                            <TabsTrigger value="loan">Bayar Angsuran</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="savings" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Rekening Simpanan</label>
                                    <Select onValueChange={setSelectedAccount} value={selectedAccount}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Rekening" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>
                                                    {acc.product?.name} - {acc.account_number}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Bank</label>
                                    <Select onValueChange={setSelectedBank} value={selectedBank}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BCA">BCA</SelectItem>
                                            <SelectItem value="BRI">BRI</SelectItem>
                                            <SelectItem value="BNI">BNI</SelectItem>
                                            <SelectItem value="MANDIRI">Mandiri</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button 
                                onClick={handleCreateSavingsVA} 
                                disabled={loading || !selectedAccount}
                                className="w-full md:w-auto"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Generate VA Simpanan
                            </Button>
                        </TabsContent>

                        <TabsContent value="loan" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Pilih Pinjaman</label>
                                    <Select onValueChange={setSelectedLoan} value={selectedLoan}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Pinjaman Aktif" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loans.map(loan => (
                                                <SelectItem key={loan.id} value={loan.id}>
                                                    {loan.product?.name} ({loan.loan_code}) - Sisa: Rp {loan.remaining_principal?.toLocaleString()}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Bank</label>
                                    <Select onValueChange={setSelectedBank} value={selectedBank}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih Bank" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BCA">BCA</SelectItem>
                                            <SelectItem value="BRI">BRI</SelectItem>
                                            <SelectItem value="BNI">BNI</SelectItem>
                                            <SelectItem value="MANDIRI">Mandiri</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button 
                                onClick={handleCreateLoanVA} 
                                disabled={loading || !selectedLoan}
                                className="w-full md:w-auto bg-amber-600 hover:bg-amber-700"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Generate VA Angsuran
                            </Button>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <h3 className="text-lg font-semibold mt-8">Daftar Virtual Account Aktif</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingVAs.map((va) => (
                    <Card key={va.id} className={`border-l-4 ${va.type === 'loan' ? 'border-l-amber-500' : 'border-l-red-500'}`}>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${va.type === 'loan' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                    {va.type === 'loan' ? <Banknote className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                                </div>
                                <span className="px-2 py-1 text-xs font-semibold bg-slate-100 rounded text-slate-600">
                                    {va.bank_code}
                                </span>
                            </div>
                            
                            <div className="space-y-1 mb-4">
                                <p className="text-sm text-slate-500">{va.type === 'loan' ? 'VA Angsuran' : 'VA Simpanan'}</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-xl font-bold tracking-tight">{va.va_number}</p>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(va.va_number)}>
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-400 truncate">{va.name}</p>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs text-slate-500">Status</span>
                                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                    Active
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

