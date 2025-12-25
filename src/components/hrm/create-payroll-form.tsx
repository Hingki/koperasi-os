'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPayrollAction } from '@/lib/actions/hrm';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface CreatePayrollFormProps {
    employees: any[];
    onSuccess?: () => void;
}

export function CreatePayrollForm({ employees, onSuccess }: CreatePayrollFormProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await createPayrollAction(formData);
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
                description: 'Slip gaji berhasil dibuat.',
            });
            if (onSuccess) onSuccess();
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Karyawan</Label>
                <Select name="employee_id" required>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih Karyawan" />
                    </SelectTrigger>
                    <SelectContent>
                        {employees?.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Input name="period_month" type="number" defaultValue={currentMonth} min={1} max={12} required />
                </div>
                <div className="space-y-2">
                    <Label>Tahun</Label>
                    <Input name="period_year" type="number" defaultValue={currentYear} required />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Gaji Pokok</Label>
                <Input name="basic_salary" type="number" defaultValue={0} required />
            </div>
            <div className="space-y-2">
                <Label>Tunjangan</Label>
                <Input name="allowances" type="number" defaultValue={0} />
            </div>
            <div className="space-y-2">
                <Label>Potongan (BPJS/Kasbon)</Label>
                <Input name="deductions" type="number" defaultValue={0} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Draft
            </Button>
        </form>
    );
}
