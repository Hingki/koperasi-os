import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function BoardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengurus & Pengawas</h1>
          <p className="text-muted-foreground">
            Daftar pengurus dan pengawas aktif periode ini.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengurus
        </Button>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="text-center py-10">
            <p className="text-muted-foreground">Belum ada data pengurus yang ditambahkan.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
