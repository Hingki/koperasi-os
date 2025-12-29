'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createAccount, updateAccount, CreateAccountState } from '@/app/dashboard/accounting/coa/actions';
import { Account } from '@/types/accounting';
import { Loader2 } from 'lucide-react';

interface CoaFormProps {
  parentAccount?: Account; // If creating sub-account
  existingAccount?: Account; // If editing
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const initialState: CreateAccountState = { message: '', errors: {} };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditing ? 'Simpan Perubahan' : 'Buat Akun'}
    </Button>
  );
}

export function CoaForm({ parentAccount, existingAccount, open, onOpenChange }: CoaFormProps) {
  // We use separate actions for create vs update because update is restricted
  const isEditing = !!existingAccount;
  // @ts-ignore - useActionState is newer, useFormState is standard in Next 14
  // We'll use a simple wrapper for now or handle submission manually if state management is tricky
  // For simplicity, let's use a standard form handler for this iteration

  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    let result;

    if (isEditing) {
      result = await updateAccount(initialState, formData);
    } else {
      result = await createAccount(initialState, formData);
    }

    if (result.errors) {
      // Ideally parse field errors, for now show general message or first error
      setError('Terdapat kesalahan input.');
    } else if (result.message && result.message !== 'Akun berhasil dibuat.' && result.message !== 'Akun berhasil diperbarui.') {
      setError(result.message);
    } else {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Akun' : parentAccount ? `Tambah Sub-Akun dari ${parentAccount.code}` : 'Tambah Akun Baru'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Hanya Nama dan Status yang dapat diubah sesuai aturan SAK-EP.'
              : 'Pastikan Tipe Akun dan Saldo Normal sesuai standar akuntansi.'}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {isEditing && <input type="hidden" name="id" value={existingAccount.id} />}
          {parentAccount && <input type="hidden" name="parent_id" value={parentAccount.id} />}

          <div className="grid gap-2">
            <Label htmlFor="code">Kode Akun</Label>
            <Input
              id="code"
              name="code"
              defaultValue={existingAccount?.code}
              disabled={isEditing} // Code is immutable
              placeholder="Contoh: 1-1101"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nama Akun</Label>
            <Input
              id="name"
              name="name"
              defaultValue={existingAccount?.name}
              placeholder="Contoh: Kas Kecil"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipe Akun</Label>
              <Select name="type" defaultValue={existingAccount?.type || parentAccount?.type} disabled={isEditing}>
                <SelectTrigger disabled={isEditing}>
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Aset (Harta)</SelectItem>
                  <SelectItem value="liability">Liabilitas (Utang)</SelectItem>
                  <SelectItem value="equity">Ekuitas (Modal)</SelectItem>
                  <SelectItem value="income">Pendapatan</SelectItem>
                  <SelectItem value="expense">Beban</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="normal_balance">Saldo Normal</Label>
              <Select name="normal_balance" defaultValue={existingAccount?.normal_balance || parentAccount?.normal_balance} disabled={isEditing}>
                <SelectTrigger disabled={isEditing}>
                  <SelectValue placeholder="Pilih Saldo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Kredit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Input id="description" name="description" defaultValue={existingAccount?.description || ''} />
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                value="true"
                defaultChecked={existingAccount.is_active}
                aria-label="Status Akun"
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
              />
              <Label htmlFor="is_active">Akun Aktif</Label>
            </div>
          )}

          <DialogFooter>
            <SubmitButton isEditing={isEditing} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
