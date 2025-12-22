'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAsset, updateAsset } from "@/lib/actions/asset-actions";
import { useFormState } from "react-dom"; // Updated hook for Server Actions
import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

// Shim for useActionState if needed, or use useFormState (deprecated name but still works in Next 14/15 mostly, or use new hook)
// In Next.js 14/15, useFormState is common.

export function AssetForm({ initialData }: { initialData?: any }) {
    const { toast } = useToast();
    const router = useRouter();
    
    // Bind ID for update if initialData exists
    const action = initialData ? updateAsset.bind(null, initialData.id) : createAsset;
    const [state, formAction] = useFormState(action, { success: false, error: '' });

    useEffect(() => {
        if (state?.success) {
            toast({ title: initialData ? 'Aset diperbarui' : 'Aset berhasil ditambahkan' });
            router.push('/dashboard/settings/assets');
            router.refresh();
        } else if (state?.error) {
            toast({ title: 'Gagal menyimpan', description: state.error, variant: 'destructive' });
        }
    }, [state, toast, router, initialData]);

    return (
        <Card>
            <CardContent className="pt-6">
                <form action={formAction} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="asset_code">Kode Aset</Label>
                            <Input 
                                id="asset_code" 
                                name="asset_code" 
                                defaultValue={initialData?.asset_code} 
                                placeholder="Contoh: AST-001" 
                                required 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Aset</Label>
                            <Input 
                                id="name" 
                                name="name" 
                                defaultValue={initialData?.name} 
                                placeholder="Contoh: Laptop Dell XPS" 
                                required 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Input 
                                id="category" 
                                name="category" 
                                defaultValue={initialData?.category} 
                                placeholder="Contoh: Elektronik, Furniture" 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchase_date">Tanggal Pembelian</Label>
                            <Input 
                                type="date"
                                id="purchase_date" 
                                name="purchase_date" 
                                defaultValue={initialData?.purchase_date} 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purchase_cost">Harga Perolehan (Rp)</Label>
                            <Input 
                                type="number"
                                id="purchase_cost" 
                                name="purchase_cost" 
                                defaultValue={initialData?.purchase_cost || 0}
                                min="0"
                                required 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="useful_life_months">Umur Ekonomis (Bulan)</Label>
                            <Input 
                                type="number"
                                id="useful_life_months" 
                                name="useful_life_months" 
                                defaultValue={initialData?.useful_life_months}
                                placeholder="Contoh: 48"
                                min="0" 
                            />
                        </div>
                        
                         <div className="space-y-2">
                            <Label htmlFor="residual_value">Nilai Residu (Rp)</Label>
                            <Input 
                                type="number"
                                id="residual_value" 
                                name="residual_value" 
                                defaultValue={initialData?.residual_value || 0}
                                min="0" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Catatan</Label>
                        <Textarea 
                            id="notes" 
                            name="notes" 
                            defaultValue={initialData?.notes} 
                            placeholder="Keterangan tambahan..." 
                        />
                    </div>

                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Batal
                        </Button>
                        <Button type="submit">
                            {initialData ? 'Simpan Perubahan' : 'Tambah Aset'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
