'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { openNewPeriodAction } from '@/lib/actions/accounting-period';
import { useTransition } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function OpenPeriodButton() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleOpenPeriod = () => {
    startTransition(async () => {
      try {
        await openNewPeriodAction();
        toast({
          title: "Periode Baru Dibuka",
          description: "Periode akuntansi baru telah berhasil dibuat.",
        });
      } catch (error: any) {
        toast({
          title: "Gagal Membuka Periode",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Button 
      className="flex items-center gap-2" 
      onClick={handleOpenPeriod}
      disabled={isPending}
    >
      <Plus className="h-4 w-4" />
      {isPending ? 'Membuka...' : 'Buka Periode Baru (Auto)'}
    </Button>
  );
}
