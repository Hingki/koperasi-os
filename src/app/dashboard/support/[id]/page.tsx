import { getTicketDetailsAction } from '@/lib/actions/support';
import { TicketChat } from '@/components/support/ticket-chat';
import { AdminTicketControls } from '@/components/support/admin-ticket-controls';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
    const { success, ticket, messages } = await getTicketDetailsAction(params.id);

    if (!success || !ticket) {
        redirect('/dashboard/support');
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-4 flex-none">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/support">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Detail Tiket #{ticket.id.substring(0, 8)}
                    </h1>
                    <p className="text-slate-500">
                        Dari: {ticket.member?.nama_lengkap} ({ticket.member?.no_anggota})
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-4 h-full">
                <div className="lg:col-span-3 h-full">
                     <TicketChat ticket={ticket} messages={messages || []} currentUserType="admin" />
                </div>
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Kontrol Admin</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AdminTicketControls ticketId={ticket.id} currentStatus={ticket.status} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
