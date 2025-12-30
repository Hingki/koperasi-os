'use client';

import { Badge } from '@/components/ui/badge';
import { Megaphone } from 'lucide-react';
import { PILOT_MODE } from '@/lib/config';

export function PilotBanner({ route }: { route?: string }) {
  if (!PILOT_MODE) return null;
  return (
    <div className="rounded-lg border bg-slate-50 p-3 flex items-center gap-3">
      <Megaphone className="h-4 w-4 text-red-600" />
      <div className="text-sm text-slate-700">
        Pilot Operasional RW Terbatas — Sistem dalam mode observasi. Tidak ada perubahan finansial.
        {route ? <span className="ml-2 text-slate-400">({route})</span> : null}
      </div>
      <div className="ml-auto">
        <Badge variant="outline" className="text-xs">PILOT MODE</Badge>
      </div>
    </div>
  );
}

