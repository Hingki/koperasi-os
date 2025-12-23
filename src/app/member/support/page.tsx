import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';
import { CreateTicketDialog } from './create-ticket-dialog';
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false });

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'open': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><AlertCircle className="w-3 h-3 mr-1"/> Open</Badge>;
        case 'in_progress': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1"/> In Progress</Badge>;
        case 'closed': return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200"><CheckCircle className="w-3 h-3 mr-1"/> Closed</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tiket Support</h2>
          <p className="text-slate-500">Pusat bantuan dan layanan anggota.</p>
        </div>
        <CreateTicketDialog />
      </div>

      <div className="grid gap-4">
        {tickets?.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <MessageSquare className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium">Belum ada tiket support</p>
                    <p className="text-sm">Jika anda memiliki pertanyaan, silakan buat tiket baru.</p>
                </CardContent>
            </Card>
        ) : (
            tickets?.map((ticket: any) => (
                <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg font-semibold text-slate-900 mb-1">
                                    {ticket.subject}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Dibuat pada {new Date(ticket.created_at).toLocaleDateString('id-ID', {
                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </CardDescription>
                            </div>
                            {getStatusBadge(ticket.status)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-50 p-4 rounded-md text-sm text-slate-700 mb-4 whitespace-pre-wrap">
                            {ticket.message}
                        </div>
                        
                        {ticket.admin_response && (
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-md text-sm">
                                <h4 className="font-semibold text-emerald-800 mb-1 flex items-center">
                                    <MessageSquare className="w-4 h-4 mr-2"/> Respon Admin
                                </h4>
                                <div className="text-emerald-900 whitespace-pre-wrap">
                                    {ticket.admin_response}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
}
