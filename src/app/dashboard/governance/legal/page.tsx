import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">RAT & Dokumen Legal</h1>
        <p className="text-muted-foreground">
          Repositori dokumen legalitas dan notulensi RAT.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <p>Halaman manajemen dokumen legal.</p>
        </CardContent>
      </Card>
    </div>
  );
}
