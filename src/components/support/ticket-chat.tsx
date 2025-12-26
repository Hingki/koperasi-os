'use client';

import { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, User as UserIcon, Shield } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { replyTicketAction } from '@/lib/actions/support';
import { useFormStatus } from 'react-dom';

interface Message {
    id: string;
    sender_type: 'member' | 'admin';
    message: string;
    created_at: string;
}

interface Ticket {
    id: string;
    subject: string;
    status: string;
    category: string;
    created_at: string;
}

interface TicketChatProps {
    ticket: Ticket;
    messages: Message[];
    currentUserType: 'member' | 'admin';
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="icon" disabled={pending}>
            <Send className="h-4 w-4" />
        </Button>
    );
}

export function TicketChat({ ticket, messages, currentUserType }: TicketChatProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleReply = async (formData: FormData) => {
        const message = formData.get('message') as string;
        if (!message.trim()) return;
        
        await replyTicketAction(ticket.id, message, currentUserType);
        
        // Reset form (simple way)
        const form = document.getElementById('reply-form') as HTMLFormElement;
        form?.reset();
    };

    return (
        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-12rem)]">
            {/* Ticket Info - Sidebar on Desktop */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Detail Tiket</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Subjek</label>
                            <p className="font-medium text-slate-900">{ticket.subject}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Kategori</label>
                            <p className="capitalize text-slate-900">{ticket.category}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Status</label>
                            <div className="mt-1">
                                <Badge variant="outline" className={`capitalize ${
                                    ticket.status === 'open' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                    ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>
                                    {ticket.status}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Dibuat Pada</label>
                            <p className="text-sm text-slate-900">{formatDate(ticket.created_at)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-2 flex flex-col h-full">
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/50 py-4">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-slate-500" />
                            <h3 className="font-semibold text-slate-900">Riwayat Percakapan</h3>
                        </div>
                    </CardHeader>
                    
                    {/* Messages List */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                        {messages.map((msg) => {
                            const isMe = msg.sender_type === currentUserType;
                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <Avatar className="h-8 w-8 mt-1 border">
                                        <AvatarFallback className={msg.sender_type === 'admin' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>
                                            {msg.sender_type === 'admin' ? <Shield className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-4 py-2 rounded-lg text-sm ${
                                            isMe 
                                                ? 'bg-red-600 text-white rounded-tr-none' 
                                                : 'bg-white border text-slate-900 rounded-tl-none shadow-sm'
                                        }`}>
                                            {msg.message}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                                            {formatDate(msg.created_at)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Reply Input */}
                    <div className="p-4 border-t bg-white">
                        {ticket.status === 'closed' ? (
                            <div className="text-center text-slate-500 text-sm py-2 bg-slate-50 rounded-md border border-dashed">
                                Tiket ini telah ditutup. Anda tidak dapat mengirim pesan baru.
                            </div>
                        ) : (
                            <form id="reply-form" action={handleReply} className="flex gap-2 items-end">
                                <Textarea 
                                    name="message" 
                                    placeholder="Tulis balasan anda..." 
                                    className="min-h-[2.5rem] max-h-32 resize-none py-3"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            e.currentTarget.form?.requestSubmit();
                                        }
                                    }}
                                />
                                <SubmitButton />
                            </form>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

import { MessageSquare } from 'lucide-react';
