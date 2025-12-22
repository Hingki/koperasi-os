'use client';

import { deleteLoanProduct } from '@/lib/actions/product';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useTransition } from 'react';

export function DeleteProductButton({ id }: { id: string }) {
    const [isPending, startTransition] = useTransition();
    
    return (
        <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={isPending}
            onClick={() => {
                if (confirm('Apakah anda yakin ingin menghapus produk ini?')) {
                    startTransition(async () => {
                        await deleteLoanProduct(id);
                    });
                }
            }}
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
}
