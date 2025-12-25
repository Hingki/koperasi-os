import { createClient } from '@/lib/supabase/server';
import { HrmService } from '@/lib/services/hrm-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePayrollForm } from '@/components/hrm/create-payroll-form';
import { formatCurrency } from '@/lib/utils';

export default async function PayrollPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const hrmService = new HrmService(supabase);
  const employees = await hrmService.getEmployees(user.user_metadata.koperasi_id);
  
  // Fetch payrolls - implementing a quick query here as service method for list might be missing
  const { data: payrolls } = await supabase
    .from('hrm_payroll')
    .select('*, employee:employees(full_name, employee_no)')
    .eq('koperasi_id', user.user_metadata.koperasi_id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Penggajian (Payroll)</h1>
        <Dialog>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Buat Slip Gaji</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Buat Slip Gaji Baru</DialogTitle>
                    <DialogDescription>
                        Hitung gaji karyawan untuk periode ini.
                    </DialogDescription>
                </DialogHeader>
                <CreatePayrollForm employees={employees || []} />
            </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-white">
        <div className="p-4 border-b">
            <h3 className="font-semibold">Riwayat Penggajian</h3>
        </div>
        <div className="divide-y">
            {payrolls && payrolls.length > 0 ? (
                payrolls.map((payroll: any) => (
                    <div key={payroll.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                            <div className="font-medium">{payroll.employee?.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                                Periode: {payroll.period_month}/{payroll.period_year} • {payroll.status.toUpperCase()}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold">{formatCurrency(payroll.net_salary)}</div>
                            <Button variant="ghost" size="sm" className="h-8">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    Belum ada data penggajian.
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
