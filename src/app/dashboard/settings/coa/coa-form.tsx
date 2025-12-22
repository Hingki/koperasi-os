'use client';

import { createAccount, updateAccount } from '@/lib/actions/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface Account {
  id?: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
}

export function CoaForm({ initialData }: { initialData?: Account }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
        const action = initialData ? updateAccount : createAccount;
        if (initialData?.id) {
            formData.append('id', initialData.id);
        }
        
        const result = await action(formData);
        if (result?.error) {
            alert(result.error);
        }
    } catch (e) {
        alert('An error occurred');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="account_code">Kode Akun</Label>
        <Input 
            id="account_code" 
            name="account_code" 
            placeholder="Contoh: 1-1001" 
            defaultValue={initialData?.account_code}
            required 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_name">Nama Akun</Label>
        <Input 
            id="account_name" 
            name="account_name" 
            placeholder="Contoh: Kas Besar" 
            defaultValue={initialData?.account_name}
            required 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label htmlFor="account_type">Tipe Akun</Label>
            <select 
                id="account_type" 
                name="account_type" 
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={initialData?.account_type || 'asset'}
                required
            >
                <option value="asset">Aset (Harta)</option>
                <option value="liability">Liabilitas (Hutang)</option>
                <option value="equity">Ekuitas (Modal)</option>
                <option value="revenue">Pendapatan</option>
                <option value="expense">Beban</option>
            </select>
        </div>

        <div className="space-y-2">
            <Label htmlFor="normal_balance">Saldo Normal</Label>
            <select 
                id="normal_balance" 
                name="normal_balance" 
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={initialData?.normal_balance || 'debit'}
                required
            >
                <option value="debit">Debit</option>
                <option value="credit">Kredit</option>
            </select>
        </div>
      </div>

      <div className="pt-4 flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
            {initialData ? 'Update Akun' : 'Simpan Akun'}
        </Button>
        <Button variant="outline" type="button" onClick={() => window.history.back()}>Batal</Button>
      </div>
    </form>
  );
}
