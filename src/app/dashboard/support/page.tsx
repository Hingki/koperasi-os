import { getAdminTicketsAction } from '@/lib/actions/support';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default async function SupportPage() {
    const { success, data: tickets, error } = await getAdminTicketsAction();

    if (!success) {
        return <div className="p-6 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support Tickets</h1>
                    <p className="text-slate-500">Daftar laporan masalah dan bantuan dari anggota.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tiket</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tickets?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Perlu Respon</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tickets?.filter((t: any) => t.status === 'open').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tickets?.filter((t: any) => t.status === 'resolved' || t.status === 'closed').length || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-white">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Tiket Terbaru</h3>
                </div>
                <div className="divide-y">
                    {tickets?.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Belum ada tiket masuk.
                        </div>
                    ) : (
                        tickets?.map((ticket: any) => (
                            <Link 
                                key={ticket.id} 
                                href={`/dashboard/support/${ticket.id}`}
                                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${
                                        ticket.status === 'open' ? 'bg-red-100 text-red-600' :
                                        ticket.status === 'resolved' ? 'bg-green-100 text-green-600' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {ticket.status === 'open' ? <AlertCircle className="h-5 w-5" /> :
                                         ticket.status === 'resolved' ? <CheckCircle className="h-5 w-5" /> :
                                         <Clock className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{ticket.subject}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{ticket.member?.nama_lengkap || 'Anggota'}</span>
                                            <span>•</span>
                                            <span className="capitalize">{ticket.category.replace('_', ' ')}</span>
                                            <span>•</span>
                                            <span>{formatDate(ticket.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant={
                                        ticket.priority === 'high' ? 'destructive' :
                                        ticket.priority === 'medium' ? 'default' : 'secondary'
                                    } className={
                                        ticket.priority === 'high' ? 'bg-red-600' :
                                        ticket.priority === 'medium' ? 'bg-orange-500' : 'bg-slate-500'
                                    }>
                                        {ticket.priority}
                                    </Badge>
                                    <Badge variant="outline" className={`capitalize ${
                                        ticket.status === 'open' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                        ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}>
                                        {ticket.status}
                                    </Badge>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
