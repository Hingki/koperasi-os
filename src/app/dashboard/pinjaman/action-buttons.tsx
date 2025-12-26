'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import { useToast } from '../../../components/ui/use-toast';
import { reviewLoanApplication, disburseLoan } from '@/lib/actions/loan';
import { CheckCircle, XCircle, Banknote, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LoanActionButtonsProps {
    id: string;
    status: string;
    amount: number;
}

export function LoanActionButtons({ id, status, amount }: LoanActionButtonsProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [notes, setNotes] = useState('');
    const [openApprove, setOpenApprove] = useState(false);
    const [openReject, setOpenReject] = useState(false);
    const [openDisburse, setOpenDisburse] = useState(false);

    const handleReview = async (decision: 'approved' | 'rejected') => {
        setIsLoading(true);
        try {
            const result = await reviewLoanApplication(id, decision, notes);
            if (result.success) {
                toast({
                    title: decision === 'approved' ? "Pengajuan Disetujui" : "Pengajuan Ditolak",
                    description: "Status pengajuan telah diperbarui.",
                    variant: decision === 'approved' ? "default" : "destructive", 
                });
                setOpenApprove(false);
                setOpenReject(false);
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Gagal memproses",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisburse = async () => {
        setIsLoading(true);
        try {
            const result = await disburseLoan(id);
            if (result.success) {
                toast({
                    title: "Pencairan Berhasil",
                    description: "Dana pinjaman telah dicairkan dan jurnal akuntansi tercatat.",
                    className: "bg-green-600 text-white border-0"
                });
                setOpenDisburse(false);
                router.refresh();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Gagal mencairkan",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'submitted') {
        return (
            <div className="flex gap-2">
                <Dialog open={openReject} onOpenChange={setOpenReject}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <XCircle className="h-4 w-4 mr-2" />
                            Tolak
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tolak Pengajuan Pinjaman</DialogTitle>
                            <DialogDescription>
                                Apakah Anda yakin ingin menolak pengajuan ini? Berikan alasan penolakan.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <label className="text-sm font-medium mb-2 block">Alasan Penolakan</label>
                            <Textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Contoh: Rasio hutang terlalu tinggi..."
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenReject(false)}>Batal</Button>
                            <Button 
                                variant="destructive" 
                                onClick={() => handleReview('rejected')}
                                disabled={isLoading || !notes}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tolak Pengajuan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={openApprove} onOpenChange={setOpenApprove}>
                    <DialogTrigger asChild>
                        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Setujui
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Setujui Pengajuan Pinjaman</DialogTitle>
                            <DialogDescription>
                                Pengajuan akan disetujui dan menunggu proses pencairan dana.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <label className="text-sm font-medium mb-2 block">Catatan Tambahan (Opsional)</label>
                            <Textarea 
                                value={notes} 
                                onChange={(e) => setNotes(e.target.value)} 
                                placeholder="Catatan untuk pemohon..."
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenApprove(false)}>Batal</Button>
                            <Button 
                                className="bg-green-600 hover:bg-green-700" 
                                onClick={() => handleReview('approved')}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Setujui Pengajuan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    if (status === 'approved') {
        return (
            <Dialog open={openDisburse} onOpenChange={setOpenDisburse}>
                <DialogTrigger asChild>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        <Banknote className="h-4 w-4 mr-2" />
                        Cairkan Dana
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pencairan Dana</DialogTitle>
                        <DialogDescription>
                            Tindakan ini akan mencairkan dana pinjaman dan mencatat transaksi pengeluaran kas/bank.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 text-center">
                         <p className="text-sm text-slate-500 mb-2">Total Dana Cair</p>
                         <p className="text-3xl font-bold text-slate-900">
                             {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}
                         </p>
                         <p className="text-xs text-amber-600 mt-4 bg-amber-50 p-2 rounded">
                            Pastikan dana tersedia di Kas/Bank sebelum melanjutkan.
                         </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDisburse(false)}>Batal</Button>
                        <Button 
                            className="bg-teal-600 hover:bg-teal-700" 
                            onClick={handleDisburse}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Konfirmasi Pencairan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return null;
}
