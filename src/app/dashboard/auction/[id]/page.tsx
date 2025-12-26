import { createClient } from '@/lib/supabase/server';
import { AuctionService } from '@/lib/services/auction-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BidForm } from '@/components/auction/bid-form';
import { formatCurrency } from '@/lib/utils';
import { Clock, Tag, User } from 'lucide-react';

export default async function AuctionDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const auctionService = new AuctionService(supabase);
  const auction = await auctionService.getAuctionById(params.id);
  const bids = await auctionService.getBids(params.id);

  const minBid = auction.current_price + auction.min_increment;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{auction.product_name}</CardTitle>
            <p className="text-muted-foreground">{auction.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose text-sm text-slate-600">
                <p>{auction.description || 'Tidak ada deskripsi.'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-400" />
                    <span>Open: {formatCurrency(auction.start_price)}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Ends: {new Date(auction.end_time).toLocaleString()}</span>
                </div>
            </div>

            <div className="p-6 bg-red-50 rounded-xl text-center space-y-2">
              <p className="text-sm text-red-600 font-medium">Harga Saat Ini</p>
              <p className="text-4xl font-bold text-red-900">{formatCurrency(auction.current_price)}</p>
            </div>

            <BidForm auction={auction} minBid={minBid} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Riwayat Penawaran ({bids ? bids.length : 0})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {bids && bids.length > 0 ? (
                        bids.map((bid: any) => (
                            <div key={bid.id} className="flex items-center justify-between p-3 border-b last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User className="h-4 w-4 text-slate-500" />
                                    </div>
                                    <div>
                                        {/* Ideally mask the name if public */}
                                        <p className="font-medium text-sm">User #{bid.user_id.substring(0, 4)}</p> 
                                        <p className="text-xs text-muted-foreground">{new Date(bid.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="font-bold text-slate-900">
                                    {formatCurrency(bid.amount)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Belum ada penawaran.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
