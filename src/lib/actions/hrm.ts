'use server';

import { createClient } from '@/lib/supabase/server';
import { HrmService } from '@/lib/services/hrm-service';
import { revalidatePath } from 'next/cache';

export async function checkInAttendance(lat?: number, long?: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const hrmService = new HrmService(supabase);
  
  try {
    const employee = await hrmService.getEmployeeByUserId(user.id);
    if (!employee) return { error: 'You are not registered as an employee' };

    await hrmService.checkIn(
        user.user_metadata.koperasi_id,
        employee.id,
        (lat && long) ? { lat, long } : undefined
    );

    revalidatePath('/dashboard/hrm');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function checkOutAttendance(attendanceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const hrmService = new HrmService(supabase);
  
  try {
    await hrmService.checkOut(attendanceId);
    revalidatePath('/dashboard/hrm');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createEmployeeAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const hrmService = new HrmService(supabase);
    
    try {
        await hrmService.createEmployee({
            koperasi_id: user.user_metadata.koperasi_id,
            full_name: formData.get('full_name') as string,
            employee_no: formData.get('employee_no') as string,
            job_title: formData.get('job_title') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
        });
        revalidatePath('/dashboard/hrm/employees');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function createPayrollAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const hrmService = new HrmService(supabase);
    
    try {
        await hrmService.createPayroll({
            koperasi_id: user.user_metadata.koperasi_id,
            employee_id: formData.get('employee_id') as string,
            period_month: Number(formData.get('period_month')),
            period_year: Number(formData.get('period_year')),
            basic_salary: Number(formData.get('basic_salary')),
            allowances: Number(formData.get('allowances')),
            deductions: Number(formData.get('deductions')),
        });
        revalidatePath('/dashboard/hrm/payroll');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
