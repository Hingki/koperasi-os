'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteAsset } from "@/lib/actions/asset-actions"; // We'll create this action
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface Asset {
    id: string;
    asset_code: string;
    name: string;
    category: string | null;
    purchase_date: string | null;
    purchase_cost: number;
    useful_life_months: number | null;
    status?: string; // from employees table example, but here we don't have status column in table def, just is_active
}

export function AssetTable({ assets }: { assets: Asset[] }) {
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        
        const result = await deleteAsset(id);
        if (result.success) {
            toast({ title: 'Asset deleted' });
            router.refresh();
        } else {
            toast({ title: 'Error deleting asset', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Kode Aset</TableHead>
                    <TableHead>Nama Aset</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal Beli</TableHead>
                    <TableHead className="text-right">Harga Perolehan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {assets.map((asset) => (
                    <TableRow key={asset.id}>
                        <TableCell className="font-mono">{asset.asset_code}</TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.category || '-'}</TableCell>
                        <TableCell>
                            {asset.purchase_date 
                                ? new Date(asset.purchase_date).toLocaleDateString('id-ID') 
                                : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(asset.purchase_cost)}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                                <Link href={`/dashboard/settings/assets/${asset.id}/edit`}>
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4 text-slate-500" />
                                    </Button>
                                </Link>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                {assets.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                            Belum ada data aset.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
