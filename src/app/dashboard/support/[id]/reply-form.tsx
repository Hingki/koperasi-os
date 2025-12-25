
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { replyTicket } from '@/lib/actions/admin-support';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function ReplyForm({ ticket }: { ticket: any }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.append('ticketId', ticket.id);

    const result = await replyTicket(formData);

    if (result.error) {
        toast({
            variant: "destructive",
            title: "Gagal mengirim balasan",
            description: typeof result.error === 'string' ? result.error : "Terjadi kesalahan validasi"
        });
    } else {
        toast({
            title: "Balasan terkirim",
            description: "Tiket telah diperbarui."
        });
        // Optionally reset form if needed, but page will revalidate
    }
    setLoading(false);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Balas Tiket</CardTitle>
        </CardHeader>
        <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="status">Update Status</Label>
                    <Select name="status" defaultValue={ticket.status}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="reply">Pesan Balasan</Label>
                    <Textarea 
                        id="reply" 
                        name="reply" 
                        placeholder="Tulis balasan anda disini..." 
                        className="min-h-[150px]"
                        defaultValue={ticket.admin_response || ''}
                        required
                    />
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Kirim Balasan
                </Button>
            </CardFooter>
        </form>
    </Card>
  );
}
