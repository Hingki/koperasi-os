'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createTicket } from '@/lib/actions/member-support';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const result = await createTicket(formData);

    setLoading(false);

    if (result?.error) {
      let errorMsg = 'Terjadi kesalahan';
      if (typeof result.error === 'string') {
        errorMsg = result.error;
      } else if (typeof result.error === 'object') {
        const firstKey = Object.keys(result.error)[0];
        if (firstKey && Array.isArray(result.error[firstKey])) {
           errorMsg = result.error[firstKey][0];
        }
      }

      toast({
        title: 'Gagal',
        description: errorMsg,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Berhasil',
        description: 'Tiket support telah dibuat.',
      });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buat Tiket Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Buat Tiket Support</DialogTitle>
          <DialogDescription>
            Sampaikan pertanyaan atau kendala anda kepada pengurus koperasi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
             <Label htmlFor="subject">Subjek / Judul</Label>
             <Input id="subject" name="subject" placeholder="Contoh: Kendala Login, Pertanyaan SHU" required />
          </div>

          <div className="grid gap-2">
             <Label htmlFor="message">Pesan</Label>
             <Textarea id="message" name="message" placeholder="Jelaskan detail pertanyaan atau kendala anda..." required className="min-h-[100px]" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Tiket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
