import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StructurePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Struktur Organisasi</h1>
        <p className="text-muted-foreground">
          Visualisasi struktur organisasi koperasi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bagan Struktur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[300px] border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Fitur visualisasi struktur organisasi akan segera hadir.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
