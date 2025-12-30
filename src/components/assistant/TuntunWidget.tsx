'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { askTUNTUN, type AssistantContext } from '@/lib/assistant/actions';
import { HandHeart } from 'lucide-react';

function getMemberModuleFromPath(pathname: string): AssistantContext['module_type'] {
  if (pathname.includes('/member/shu')) return 'accounting';
  if (pathname.includes('/member/simpanan')) return 'savings';
  return 'savings';
}

function getMemberTitleFromPath(pathname: string): string {
  if (pathname.includes('/member/shu')) return 'SHU Anggota';
  if (pathname.includes('/member/simpanan')) return 'Simpanan Anggota';
  if (pathname.includes('/member/dashboard')) return 'Dashboard Anggota';
  return 'Anggota';
}

function getDynamicTitle(module?: AssistantContext['module_type'], pageTitle?: string) {
  if (pageTitle === 'SHU Anggota') return 'TUNTUN – SHU Anggota';
  if (pageTitle === 'Simpanan Anggota') return 'TUNTUN – Simpanan Anggota';
  return 'TUNTUN – Dashboard Anggota';
}

function getPlaceholder(module?: AssistantContext['module_type'], pageTitle?: string) {
  if (pageTitle === 'SHU Anggota') return 'Di halaman SHU Anggota ini, tanyakan cara pembagian SHU';
  if (module === 'savings') return 'Di halaman Simpanan Anggota ini, tanyakan Simpanan Wajib/Sukarela';
  return 'Di Dashboard Anggota ini, tanyakan hal yang ingin kamu pahami';
}

export function TuntunWidget() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname() || '/member/dashboard';
  const module = getMemberModuleFromPath(pathname);
  const pageTitle = getMemberTitleFromPath(pathname);
  const ctx: AssistantContext = { current_route: pathname, page_title: pageTitle, module_type: module };

  const onAsk = () => {
    startTransition(async () => {
      const res = await askTUNTUN(question, ctx);
      setAnswer(res.answer);
      setDisclaimer(res.disclaimer);
    });
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{getDynamicTitle(module, pageTitle)}</CardTitle>
          <HandHeart className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="text-sm text-muted-foreground">READ-ONLY • Edukatif • Non-binding</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={getPlaceholder(module, pageTitle)}
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
          <Button onClick={onAsk} disabled={isPending}>Tanya</Button>
        </div>
        {answer && (
          <div className="rounded-md border p-3 text-sm space-y-2">
            <div>{answer}</div>
            {disclaimer && (
              <p className="text-xs text-slate-500">{disclaimer}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
