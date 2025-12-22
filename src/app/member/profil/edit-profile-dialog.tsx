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
import { updateMemberProfile } from '@/lib/actions/member';
import { useToast } from '@/components/ui/use-toast';
import { Pencil } from 'lucide-react';

interface EditProfileDialogProps {
  initialData: {
    phone: string;
    email: string | null;
    alamat_lengkap: string;
  };
}

export function EditProfileDialog({ initialData }: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await updateMemberProfile(formData);

    if (result.success) {
      toast({
        title: "Berhasil",
        description: "Profil berhasil diperbarui",
        variant: "default",
      });
      setOpen(false);
    } else {
      toast({
        title: "Gagal",
        description: result.error || 'Gagal memperbarui profil',
        variant: "destructive",
      });
    }

    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Edit Profil
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profil</DialogTitle>
          <DialogDescription>
            Perbarui informasi kontak dan alamat anda.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={initialData.phone}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initialData.email || ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alamat_lengkap">Alamat Lengkap</Label>
              <Textarea
                id="alamat_lengkap"
                name="alamat_lengkap"
                defaultValue={initialData.alamat_lengkap}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
