'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DateSelector({ baseUrl }: { baseUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDate = searchParams.get('asOfDate') || new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(currentDate);

  const handleUpdate = () => {
    const params = new URLSearchParams(searchParams);
    params.set('asOfDate', date);
    router.push(`${baseUrl}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4 mb-6 print:hidden">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="date" className="text-sm font-medium">Per Tanggal</label>
        <Input 
          type="date" 
          id="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          onClick={(e) => {
            // Force show picker on click anywhere in the input
            try {
              e.currentTarget.showPicker();
            } catch (err) {
              // Ignore if not supported
            }
          }}
          className="w-[200px] cursor-pointer"
        />
      </div>
      <div className="flex flex-col justify-end h-full pt-6">
        <Button onClick={handleUpdate}>Tampilkan Laporan</Button>
      </div>
    </div>
  );
}
