import { createClient } from '@/lib/supabase/server';
import { HrmService } from '@/lib/services/hrm-service';
import { AttendanceWidget } from '@/components/hrm/attendance-widget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function HrmDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const hrmService = new HrmService(supabase);
  
  // 1. Get My Employee Status
  const myEmployee = await hrmService.getEmployeeByUserId(user.id);
  
  // 2. Get Today's Attendance List (for Admin/Manager view)
  const todayAttendance = await hrmService.getTodayAttendance(koperasiId);
  
  // 3. Find My Attendance Today
  const myAttendance = myEmployee 
    ? todayAttendance.find((a: any) => a.employee_id === myEmployee.id) 
    : null;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Kepegawaian (HRM)</h1>
            <p className="text-muted-foreground">Manajemen Absensi dan Karyawan Koperasi</p>
        </div>
        <div className="space-x-2">
            <Link href="/dashboard/hrm/employees" prefetch={false}>
                <Button variant="outline">Data Karyawan</Button>
            </Link>
            <Link href="/dashboard/hrm/payroll" prefetch={false}>
                <Button variant="outline">Penggajian</Button>
            </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Widget Absensi Personal */}
        <div className="lg:col-span-1">
            {myEmployee ? (
                <AttendanceWidget attendanceToday={myAttendance} />
            ) : (
                <Card className="bg-slate-50">
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                            Akun anda belum terhubung dengan data karyawan. Hubungi Admin.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Stats */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hadir Hari Ini</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{todayAttendance.length}</div>
                <p className="text-xs text-muted-foreground">Karyawan</p>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {/* Placeholder count */}
                <div className="text-2xl font-bold">-</div> 
                <p className="text-xs text-muted-foreground">Aktif</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Periode Gaji</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{new Date().toLocaleString('default', { month: 'long' })}</div>
                <p className="text-xs text-muted-foreground">{new Date().getFullYear()}</p>
            </CardContent>
        </Card>
      </div>

      {/* Today's Attendance List */}
      <Card>
        <CardHeader>
            <CardTitle>Kehadiran Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
            {todayAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Belum ada yang check-in hari ini.</div>
            ) : (
                <div className="space-y-4">
                    {todayAttendance.map((att: any) => (
                        <div key={att.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                            <div>
                                <div className="font-medium">{att.employee?.full_name}</div>
                                <div className="text-xs text-muted-foreground">{att.employee?.job_title}</div>
                            </div>
                            <div className="text-right text-sm">
                                <div className="text-green-600">IN: {new Date(att.check_in).toLocaleTimeString()}</div>
                                {att.check_out && (
                                    <div className="text-orange-600">OUT: {new Date(att.check_out).toLocaleTimeString()}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
