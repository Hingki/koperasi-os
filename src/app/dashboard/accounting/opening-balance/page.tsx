import { Badge } from '@/components/ui/badge';
import { PanduWidget } from '@/components/assistant/PanduWidget';

export default function Page() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saldo Awal</h1>
          <p className="text-muted-foreground">Pengaturan saldo awal akun untuk awal periode.</p>
        </div>
        <Badge variant="outline" className="text-xs">Dalam Pengembangan</Badge>
      </div>

      <p>
        Fitur ini akan tersedia pada fase berikutnya. Halaman ini menyiapkan tempat untuk mengelola saldo awal
        sesuai SAK-EP tanpa mengubah jurnal yang telah diposting.
      </p>

      <PanduWidget />
    </div>
  );
}
