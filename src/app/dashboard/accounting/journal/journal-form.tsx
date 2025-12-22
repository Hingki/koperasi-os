'use client';

import { createManualJournal } from '@/lib/actions/accounting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Check if exists, else use textarea
import { useState } from 'react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
}

export function JournalForm({ accounts }: { accounts: Account[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
        const result = await createManualJournal(formData);
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
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Basic Info */}
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="entry_date">Tanggal Transaksi</Label>
                <Input type="datetime-local" id="entry_date" name="entry_date" required defaultValue={new Date().toISOString().slice(0, 16)} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="reference">Nomor Referensi (Opsional)</Label>
                <Input id="reference" name="reference" placeholder="Contoh: JU-2023-001" />
            </div>

             <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (Rp)</Label>
                <Input type="number" id="amount" name="amount" min="1" placeholder="0" required />
            </div>
        </div>

        {/* Right: Accounts */}
        <div className="space-y-4">
             <div className="space-y-2">
                <Label htmlFor="account_debit">Akun Debit (Bertambah/Berkurang)</Label>
                <select 
                    id="account_debit" 
                    name="account_debit" 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    required
                >
                    <option value="">Pilih Akun Debit...</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="account_credit">Akun Kredit (Bertambah/Berkurang)</Label>
                <select 
                    id="account_credit" 
                    name="account_credit" 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    required
                >
                    <option value="">Pilih Akun Kredit...</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Keterangan / Uraian</Label>
        <textarea 
            id="description" 
            name="description" 
            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Penjelasan transaksi..."
            required 
        />
      </div>

      <div className="pt-4 flex gap-4">
        <Button type="submit" disabled={isSubmitting}>Simpan Jurnal</Button>
        <Button variant="outline" type="button" onClick={() => window.history.back()}>Batal</Button>
      </div>
    </form>
  );
}
