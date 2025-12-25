'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createEmployeeAction } from '@/lib/actions/hrm';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function CreateEmployeeForm({ onSuccess }: { onSuccess?: () => void }) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await createEmployeeAction(formData);
        setLoading(false);

        if (res?.error) {
            toast({
                variant: 'destructive',
                title: 'Gagal',
                description: res.error,
            });
        } else {
            toast({
                title: 'Berhasil',
                description: 'Data karyawan berhasil disimpan.',
            });
            if (onSuccess) onSuccess();
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input name="full_name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>NIP / ID</Label>
                    <Input name="employee_no" required />
                </div>
                <div className="space-y-2">
                    <Label>Jabatan</Label>
                    <Input name="job_title" required />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" />
            </div>
            <div className="space-y-2">
                <Label>No. HP</Label>
                <Input name="phone" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
            </Button>
        </form>
    );
}
