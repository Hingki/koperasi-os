'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { askPANDU, type AssistantContext } from '@/lib/assistant/actions';
import { ShieldCheck } from 'lucide-react';

function getModuleTypeFromPath(pathname: string): AssistantContext['module_type'] {
  if (pathname.includes('/accounting')) return 'accounting';
  if (pathname.includes('/savings') || pathname.includes('/usp/savings')) return 'savings';
  if (pathname.includes('/pinjaman') || pathname.includes('/loan') || pathname.includes('/financing')) return 'loan';
  if (pathname.includes('/retail') || pathname.includes('/pos')) return 'retail';
  return 'accounting';
}

function getPageTitleFromPath(pathname: string): string {
  if (pathname.includes('/accounting/journal')) return 'Jurnal Umum';
  if (pathname.includes('/accounting/ledger')) return 'Buku Besar';
  if (pathname.includes('/accounting/reports')) return 'Laporan Keuangan';
  if (pathname.endsWith('/dashboard/savings') || pathname.includes('/dashboard/savings')) return 'Simpanan';
  if (pathname.includes('/dashboard/pinjaman') || pathname.includes('/dashboard/loan')) return 'Pinjaman';
  if (pathname.includes('/dashboard/retail')) return 'Retail/POS';
  if (pathname === '/dashboard') return 'Dashboard';
  return 'Halaman';
}

function getDynamicTitle(module?: AssistantContext['module_type']) {
  const map = {
    accounting: 'PANDU – Akuntansi',
    savings: 'PANDU – Simpanan',
    loan: 'PANDU – Pinjaman',
    retail: 'PANDU – Retail/POS',
  } as const;
  return map[module || 'accounting'];
}

function getPlaceholder(module?: AssistantContext['module_type']) {
  switch (module) {
    case 'savings':
      return 'Di halaman Simpanan ini, tanyakan dampak saldo awal atau jurnal setoran/penarikan';
    case 'loan':
      return 'Di halaman Pinjaman ini, tanyakan jurnal angsuran, bunga, atau penutupan pinjaman';
    case 'retail':
      return 'Di halaman Retail/POS ini, tanyakan jurnal penjualan, kas masuk/keluar, atau stok';
    case 'accounting':
    default:
      return 'Di halaman Akuntansi ini, tanyakan: tutup periode, Neraca, SHU, Arus Kas';
  }
}

export function PanduWidget() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname() || '/dashboard';
  const module = getModuleTypeFromPath(pathname);
  const pageTitle = getPageTitleFromPath(pathname);
  const ctx: AssistantContext = { current_route: pathname, page_title: pageTitle, module_type: module };

  const onAsk = () => {
    startTransition(async () => {
      const res = await askPANDU(question, ctx);
      setAnswer(res.answer);
    });
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{getDynamicTitle(module)}</CardTitle>
          <ShieldCheck className="h-5 w-5 text-red-600" />
        </div>
        <p className="text-sm text-muted-foreground">READ-ONLY + Advisory • SAK-EP Compliant</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={getPlaceholder(module)}
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <Button onClick={onAsk} disabled={isPending}>Tanya</Button>
        </div>
        {answer && (
          <div className="rounded-md border p-3 text-sm">
            {answer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
