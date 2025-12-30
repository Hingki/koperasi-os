import { Badge } from '@/components/ui/badge';
import { PanduWidget } from '@/components/assistant/PanduWidget';

export default function Page() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agunan</h1>
          <p className="text-muted-foreground">Pengelolaan agunan untuk unit Simpan Pinjam.</p>
        </div>
        <Badge variant="outline" className="text-xs">Dalam Pengembangan</Badge>
      </div>

      <p>
        Fitur ini akan tersedia pada fase berikutnya. Halaman ini menyiapkan tempat untuk administrasi agunan
        tanpa memengaruhi jurnal pinjaman.
      </p>

      <PanduWidget />
    </div>
  );
}
