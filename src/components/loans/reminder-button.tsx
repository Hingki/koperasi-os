'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export function ReminderButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRunReminder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron/due-date-reminder', {
        method: 'POST',
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to run reminder');
      }

      toast({
        title: "Pengingat Terkirim",
        description: `Berhasil memproses ${data.processed} notifikasi jatuh tempo.`,
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRunReminder} 
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BellRing className="h-4 w-4" />
      )}
      Cek Jatuh Tempo
    </Button>
  );
}
