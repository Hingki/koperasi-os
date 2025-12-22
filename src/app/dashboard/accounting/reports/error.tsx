'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Terjadi Kesalahan</AlertTitle>
        <AlertDescription>
          Gagal memuat laporan keuangan. Silakan coba lagi.
          {error.message && <div className="mt-2 text-xs font-mono">{error.message}</div>}
        </AlertDescription>
      </Alert>
      <Button onClick={() => reset()}>Coba Lagi</Button>
    </div>
  );
}
