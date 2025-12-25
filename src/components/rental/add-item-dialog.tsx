"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createRentalItemAction } from "@/lib/actions/rental";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Aset"}
    </Button>
  );
}

export function AddItemDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Tambah Aset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Aset Sewa</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createRentalItemAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Barang</Label>
            <Input id="name" name="name" placeholder="Contoh: Mobil Avanza 2022" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">Kode Aset (Opsional)</Label>
            <Input id="code" name="code" placeholder="AST-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="condition">Kondisi</Label>
              <Select name="condition" defaultValue="good">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Baik (Good)</SelectItem>
                  <SelectItem value="maintenance">Perbaikan (Maintenance)</SelectItem>
                  <SelectItem value="damaged">Rusak (Damaged)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status Awal</Label>
              <Select name="status" defaultValue="available">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Tersedia</SelectItem>
                  <SelectItem value="rented">Sedang Disewa</SelectItem>
                  <SelectItem value="maintenance">Perbaikan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price_per_hour">Harga per Jam</Label>
              <Input id="price_per_hour" name="price_per_hour" type="number" defaultValue="0" min="0" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price_per_day">Harga per Hari</Label>
              <Input id="price_per_day" name="price_per_day" type="number" defaultValue="0" min="0" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" name="description" />
          </div>
          <div className="flex justify-end pt-4">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
