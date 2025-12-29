import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FiscalYearPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tahun Buku</h1>
        <p className="text-muted-foreground">
          Pengaturan periode tahun buku akuntansi.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <p>Halaman pengaturan tahun buku.</p>
        </CardContent>
      </Card>
    </div>
  );
}
