import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hak Akses & Role</h1>
        <p className="text-muted-foreground">
          Konfigurasi peran dan izin akses pengguna sistem.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <p>Halaman konfigurasi role management.</p>
        </CardContent>
      </Card>
    </div>
  );
}
