'use client';

import { createDefaultSavingsProducts } from '@/lib/actions/savings';
import { useState } from 'react';
import { PackagePlus, CheckCircle } from 'lucide-react';

export default function SeedProductsButton() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSeed = async () => {
        if (!confirm('Buat produk default (Pokok, Wajib, Sukarela)?')) return;
        
        setLoading(true);
        try {
            await createDefaultSavingsProducts();
            setSuccess(true);
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            alert('Gagal membuat produk: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <button disabled className="flex items-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm font-medium">
                <CheckCircle className="w-4 h-4 mr-2" />
                Berhasil Dibuat!
            </button>
        );
    }

    return (
        <button 
            onClick={handleSeed}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-md text-sm font-medium transition-colors"
        >
            <PackagePlus className="w-4 h-4 mr-2" />
            {loading ? 'Memproses...' : 'Buat Produk Default'}
        </button>
    );
}
