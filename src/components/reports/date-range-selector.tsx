'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DateRangeSelector({ baseUrl }: { baseUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Defaults: Start of month to Today
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const defaultStart = startOfMonth.toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];

  const currentStart = searchParams.get('startDate') || defaultStart;
  const currentEnd = searchParams.get('endDate') || defaultEnd;

  const [startDate, setStartDate] = useState(currentStart);
  const [endDate, setEndDate] = useState(currentEnd);

  const handleUpdate = () => {
    const params = new URLSearchParams(searchParams);
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    router.push(`${baseUrl}?${params.toString()}`);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker();
    } catch (err) {
      // Ignore if not supported
    }
  };

  return (
    <div className="flex items-center gap-4 mb-6 print:hidden">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="startDate" className="text-sm font-medium">Dari Tanggal</label>
        <Input 
          type="date" 
          id="startDate" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          onClick={handleInputClick}
          className="w-[160px] cursor-pointer"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="endDate" className="text-sm font-medium">Sampai Tanggal</label>
        <Input 
          type="date" 
          id="endDate" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          onClick={handleInputClick}
          className="w-[160px] cursor-pointer"
        />
      </div>
      <div className="flex flex-col justify-end h-full pt-6">
        <Button onClick={handleUpdate}>Tampilkan Laporan</Button>
      </div>
    </div>
  );
}
