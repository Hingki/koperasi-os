import { getTicketDetailsAction } from '@/lib/actions/support';
import { TicketChat } from '@/components/support/ticket-chat';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function MemberTicketDetailPage({ params }: { params: { id: string } }) {
    const { success, ticket, messages } = await getTicketDetailsAction(params.id);

    if (!success || !ticket) {
        redirect('/member/support');
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center gap-4 flex-none">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/member/support">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">
                    {ticket.subject}
                </h1>
            </div>

            <div className="flex-1 min-h-0">
                <TicketChat ticket={ticket} messages={messages || []} currentUserType="member" />
            </div>
        </div>
    );
}
