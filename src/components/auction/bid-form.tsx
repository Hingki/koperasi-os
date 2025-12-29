'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { placeBidAction } from '@/lib/actions/auction';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Auction } from '@/lib/services/auction-service';

export function BidForm({ auction, minBid }: { auction: Auction, minBid: number }) {
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBid() {
    if (!amount) return;
    setLoading(true);
    try {
      const res = await placeBidAction(auction.id, Number(amount));
      if (res.success) {
        setAmount('');
        router.refresh();
      } else {
        alert(res.error);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  const isEnded = auction.status !== 'active' || new Date() > new Date(auction.end_time);

  if (isEnded) {
    return (
      <div className="p-4 bg-slate-100 rounded-lg text-center">
        <p className="font-semibold text-slate-500">Lelang Telah Berakhir</p>
        {auction.winner_id && (
            <p className="text-sm mt-2 text-green-600 font-medium">
                Pemenang: {formatCurrency(auction.final_price || auction.current_price)}
            </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
      <div className="space-y-2">
        <label className="text-sm font-medium">Masukkan Penawaran Anda</label>
        <div className="flex gap-2">
            <Input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${formatCurrency(minBid)}`}
                min={minBid}
            />
            <Button onClick={handleBid} disabled={loading || !amount || Number(amount) < minBid}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tawar
            </Button>
        </div>
        <p className="text-xs text-muted-foreground">
            Minimal penawaran: {formatCurrency(minBid)}
        </p>
      </div>
    </div>
  );
}
