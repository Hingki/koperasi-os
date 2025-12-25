import { createClient } from '@/lib/supabase/server';
import { HrmService } from '@/lib/services/hrm-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateEmployeeForm } from '@/components/hrm/create-employee-form';

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const hrmService = new HrmService(supabase);
  const employees = await hrmService.getEmployees(user.user_metadata.koperasi_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Karyawan</h1>
        <Dialog>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Tambah Karyawan</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Karyawan Baru</DialogTitle>
                    <DialogDescription>
                        Masukkan data karyawan baru.
                    </DialogDescription>
                </DialogHeader>
                <CreateEmployeeForm />
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees && employees.map((emp: any) => (
            <Card key={emp.id}>
                <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                        {emp.full_name.charAt(0)}
                    </div>
                    <div>
                        <CardTitle className="text-base">{emp.full_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{emp.job_title}</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">ID:</span>
                            <span>{emp.employee_no}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{emp.email || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span>{emp.phone || '-'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
