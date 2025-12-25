import { getMemberTicketsAction } from '@/lib/actions/support';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, MessageSquare, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default async function MemberSupportPage() {
    const { success, data: tickets } = await getMemberTicketsAction();

    // Group by Month-Year
    const groupedTickets: Record<string, typeof tickets> = {};
    if (success && tickets) {
        tickets.forEach((ticket: any) => {
            const date = new Date(ticket.created_at);
            const key = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            if (!groupedTickets[key]) {
                groupedTickets[key] = [];
            }
            groupedTickets[key].push(ticket);
        });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bantuan & Dukungan</h1>
                    <p className="text-slate-500">Ajukan pertanyaan, saran, atau kritik kepada pengelola.</p>
                </div>
                <Button asChild>
                    <Link href="/member/support/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Buat Tiket
                    </Link>
                </Button>
            </div>

            {success && tickets && tickets.length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(groupedTickets).map(([period, items]) => (
                        <div key={period} className="space-y-4">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                {period}
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {items?.map((ticket: any) => (
                                    <Link key={ticket.id} href={`/member/support/${ticket.id}`}>
                                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline" className={`capitalize ${
                                                        ticket.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {ticket.status}
                                                    </Badge>
                                                    <span className="text-xs text-slate-500">
                                                        {formatDate(ticket.created_at)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 line-clamp-1">{ticket.subject}</h4>
                                                    <p className="text-sm text-slate-500 capitalize">{ticket.category}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-slate-100 rounded-full mb-4">
                            <MessageSquare className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="font-semibold text-lg text-slate-900">Belum ada tiket bantuan</h3>
                        <p className="text-slate-500 max-w-sm mt-2 mb-6">
                            Jika Anda memiliki pertanyaan atau kendala, silakan buat tiket baru untuk menghubungi pengelola.
                        </p>
                        <Button asChild>
                            <Link href="/member/support/new">Buat Tiket Baru</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
