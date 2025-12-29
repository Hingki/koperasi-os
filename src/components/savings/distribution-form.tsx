'use client';

import { useFormStatus } from 'react-dom';
import { distributeSavingsInterest } from '@/lib/actions/savings';
import { AlertTriangle, Loader2 } from 'lucide-react';

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Memproses...
        </>
      ) : (
        'Jalankan Distribusi'
      )}
    </button>
  );
}

interface DistributionFormProps {
  canDistribute: boolean;
  distributeReason: string | null;
  defaultAnnualRate: number;
}

export function DistributionForm({ canDistribute, distributeReason, defaultAnnualRate }: DistributionFormProps) {
  return (
    <form action={distributeSavingsInterest} className="grid gap-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <label htmlFor="product_type" className="text-sm font-medium">Produk</label>
          <select id="product_type" name="product_type" title="Pilih produk" aria-label="Pilih produk"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="sukarela">Simpanan Sukarela</option>
            <option value="berjangka">Simpanan Berjangka</option>
            <option value="rencana">Simpanan Rencana</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="annual_rate" className="text-sm font-medium">Suku Bunga Tahunan (%)</label>
          <input id="annual_rate" type="number" step="0.01" name="annual_rate" title="Suku bunga tahunan" placeholder="Contoh: 3.5"
            defaultValue={defaultAnnualRate} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="rounded-md border p-3 text-sm bg-slate-50">
        <div className="font-medium text-slate-700">Dampak Akuntansi</div>
        <div className="mb-2">Dr Beban Bunga • Cr Simpanan</div>
        <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
          <span className="font-semibold">KONSEKUENSI:</span> Aksi ini akan membuat jurnal bunga massal untuk seluruh rekening aktif. Tidak dapat dibatalkan per massal.
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-4 pt-2">
        <SubmitButton disabled={!canDistribute} />
        {!canDistribute && distributeReason && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{distributeReason}</span>
          </div>
        )}
      </div>
    </form>
  );
}
