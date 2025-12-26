import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WhatsappService } from '@/lib/services/whatsapp-service';
import { NotificationService } from '@/lib/services/notification-service';
import { hasAnyRole } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(req: NextRequest) {
  return processRequest(req);
}

export async function POST(req: NextRequest) {
  return processRequest(req);
}

async function processRequest(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Authorization Check (Admin Session or Secret Header)
    const authHeader = req.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser();
    
    // Allow if user is admin OR if secret matches (for external cron)
    const isCronSecretValid = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    let isAuthorizedUser = false;
    if (user) {
        // Use shared RBAC helper to ensure consistency
        isAuthorizedUser = await hasAnyRole(['admin', 'ketua', 'bendahara', 'pengurus']);
    }

    if (!isCronSecretValid && !isAuthorizedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Setup Services
    // Note: For production cron usage without user session, we would need Service Role client.
    // Assuming this is triggered by admin or RLS allows reading.
    
    const whatsappService = new WhatsappService({
      provider: 'mock', // TODO: Load from config/env
      apiKey: process.env.WA_API_KEY || 'mock-key'
    });
    const notificationService = new NotificationService(supabase);

    // 3. Find Schedules Due Soon (Today or +3 Days)
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const targetDateStr = threeDaysLater.toISOString().split('T')[0];

    // Query: Status != paid AND (due_date = today OR due_date = 3 days later)
    const { data: schedules, error } = await supabase
      .from('loan_repayment_schedule')
      .select(`
        id,
        due_date,
        total_installment,
        installment_number,
        status,
        member_id,
        koperasi_id,
        loan:loans(
          loan_code
        ),
        member:member(
          id,
          nama_lengkap,
          phone,
          user_id
        )
      `)
      .neq('status', 'paid')
      .in('due_date', [todayStr, targetDateStr]); // Only today and exactly 3 days later

    if (error) {
      console.error('Error fetching schedules:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'No schedules due today or in 3 days.', count: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    // 4. Process Notifications
    const results = await Promise.allSettled(schedules.map(async (item: any) => {
        if (!item.member || !item.member.phone) return;

        const isDueToday = item.due_date === todayStr;
        const daysText = isDueToday ? 'HARI INI' : 'dalam 3 hari';
        const dateFormatted = new Date(item.due_date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        
        const amountFormatted = new Intl.NumberFormat('id-ID', { 
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0 
        }).format(item.total_installment);

        // A. Send WhatsApp
        const waMessage = `*PENGINGAT PEMBAYARAN*\n\nHalo ${item.member.nama_lengkap},\n\nKami mengingatkan bahwa angsuran pinjaman No. ${item.loan.loan_code} (Angsuran ke-${item.installment_number}) sebesar ${amountFormatted} akan jatuh tempo pada *${daysText}* (${dateFormatted}).\n\nMohon segera lakukan pembayaran untuk menghindari denda.\n\nTerima kasih,\nKoperasi OS`;

        const waSent = await whatsappService.sendMessage(item.member.phone, waMessage);

        // B. Send In-App Notification
        try {
            await notificationService.createNotification(
                item.member_id,
                `Jatuh Tempo: Angsuran Pinjaman`,
                `Angsuran ke-${item.installment_number} sebesar ${amountFormatted} jatuh tempo pada ${dateFormatted}.`
            );
        } catch (e) {
            console.error('Failed to create in-app notification', e);
        }

        if (waSent) {
            return { id: item.id, status: 'sent' };
        } else {
            throw new Error('Failed to send WA');
        }
    }));

    results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
    });

    return NextResponse.json({
        message: 'Processed due date reminders',
        processed: schedules.length,
        success: successCount,
        failed: failCount,
        target_dates: [todayStr, targetDateStr]
    });

  } catch (err: any) {
    console.error('Cron Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
