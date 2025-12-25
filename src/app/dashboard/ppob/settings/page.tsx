"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { getPPOBSettings, updatePPOBSettingsAction } from "@/lib/actions/ppob-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Pengaturan"}
    </Button>
  );
}

export default function PPOBSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPPOBSettings().then((res) => {
        setSettings(res.data);
        setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
            <CardTitle>Pengaturan PPOB</CardTitle>
            <CardDescription>Konfigurasi biaya admin global dan status layanan.</CardDescription>
        </CardHeader>
        <CardContent>
            <form action={async (formData) => {
                await updatePPOBSettingsAction(formData);
                alert("Pengaturan berhasil disimpan");
            }} className="space-y-6">
                
                <div className="grid gap-2">
                    <Label htmlFor="admin_fee">Biaya Admin Global (Default)</Label>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Rp</span>
                        <Input 
                            id="admin_fee" 
                            name="admin_fee" 
                            type="number" 
                            defaultValue={settings?.admin_fee || 0} 
                            className="max-w-[200px]"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Biaya ini akan ditambahkan ke setiap transaksi kecuali produk memiliki biaya admin spesifik.
                    </p>
                </div>

                <div className="flex items-center justify-between border p-4 rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-base">Status Layanan PPOB</Label>
                        <p className="text-sm text-muted-foreground">
                            Matikan jika layanan sedang gangguan atau maintenance.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch 
                            id="is_active" 
                            name="is_active" 
                            defaultChecked={settings?.is_active ?? true} 
                        />
                        <Label htmlFor="is_active">Aktif</Label>
                    </div>
                </div>

                <div className="pt-4">
                    <SubmitButton />
                </div>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
