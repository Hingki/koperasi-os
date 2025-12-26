'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { RatService } from '@/lib/services/rat-service';

const formSchema = z.object({
  title: z.string().min(2, 'Judul wajib diisi'),
  description: z.string().optional(),
  fiscal_year: z.coerce.number().min(2000, 'Tahun tidak valid'),
  start_time: z.string().refine((val) => val !== '', 'Waktu mulai wajib diisi'),
  location: z.string().optional(),
  meeting_link: z.string().url('Link tidak valid').optional().or(z.literal('')),
});

interface RatFormProps {
  koperasiId: string;
}

export function RatForm({ koperasiId }: RatFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const ratService = new RatService(supabase);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      fiscal_year: new Date().getFullYear(),
      start_time: '',
      location: '',
      meeting_link: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await ratService.createSession({
        koperasi_id: koperasiId,
        title: values.title,
        description: values.description,
        fiscal_year: values.fiscal_year,
        start_time: new Date(values.start_time),
        location: values.location,
        meeting_link: values.meeting_link || undefined,
      });

      toast({
        title: 'Berhasil',
        description: 'Sesi RAT berhasil dibuat.',
      });
      router.push('/dashboard/rat');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: 'Terjadi kesalahan saat membuat sesi RAT.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg border">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judul RAT</FormLabel>
              <FormControl>
                <Input placeholder="Rapat Anggota Tahunan 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi</FormLabel>
              <FormControl>
                <Textarea placeholder="Agenda pembahasan..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="fiscal_year"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tahun Buku</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormDescription>Tahun buku yang akan dilaporkan.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Waktu Mulai</FormLabel>
                <FormControl>
                    <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Lokasi (Opsional)</FormLabel>
                <FormControl>
                    <Input placeholder="Aula Koperasi / Online" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="meeting_link"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Link Meeting (Zoom/Meet)</FormLabel>
                <FormControl>
                    <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
                Batal
            </Button>
            <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Buat RAT'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
