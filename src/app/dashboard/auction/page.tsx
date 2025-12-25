import { createClient } from '@/lib/supabase/server';
import { AuctionService } from '@/lib/services/auction-service';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Gavel, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function AuctionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const auctionService = new AuctionService(supabase);
  const auctions = await auctionService.getAuctions(koperasiId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pelelangan Online</h1>
          <p className="text-muted-foreground">Lelang produk komoditas dan aset koperasi.</p>
        </div>
        <Link href="/dashboard/auction/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buat Lelang Baru
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {auctions && auctions.length > 0 ? (
          auctions.map((auction) => (
            <Link href={`/dashboard/auction/${auction.id}`} key={auction.id}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{auction.product_name}</CardTitle>
                        <Badge variant={auction.status === 'active' ? 'default' : 'secondary'}>
                            {auction.status}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{auction.title}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Harga Saat Ini</span>
                        <span className="font-bold text-lg text-green-600">{formatCurrency(auction.current_price)}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Berakhir: {new Date(auction.end_time).toLocaleDateString()}</span>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" variant={auction.status === 'active' ? 'default' : 'outline'}>
                        <Gavel className="mr-2 h-4 w-4" />
                        {auction.status === 'active' ? 'Tawar Sekarang' : 'Lihat Detail'}
                    </Button>
                </CardFooter>
                </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            Belum ada lelang yang aktif.
          </div>
        )}
      </div>
    </div>
  );
}
