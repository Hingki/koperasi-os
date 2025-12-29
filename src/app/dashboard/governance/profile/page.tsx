import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profil Koperasi</h1>
        <p className="text-muted-foreground">
          Kelola informasi dasar dan identitas koperasi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Umum</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Koperasi</Label>
              <Input placeholder="Koperasi Merah Putih" defaultValue="Koperasi Merah Putih" />
            </div>
            <div className="space-y-2">
              <Label>Nomor Badan Hukum</Label>
              <Input placeholder="AHU-xxxxx.AH.xx.xx.Tahun 20xx" />
            </div>
            <div className="space-y-2">
              <Label>Alamat Lengkap</Label>
              <Input placeholder="Jl. Raya..." />
            </div>
            <div className="space-y-2">
              <Label>Nomor Telepon</Label>
              <Input placeholder="021-xxxxxxx" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>Simpan Perubahan</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
