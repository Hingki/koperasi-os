"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createPPOBProductAction, updatePPOBProductAction } from "@/lib/actions/ppob-admin";
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
import { Plus, Edit } from "lucide-react";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : label}
    </Button>
  );
}

interface ProductDialogProps {
  product?: any;
  trigger?: React.ReactNode;
}

export function ProductDialog({ product, trigger }: ProductDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!product;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Tambah Produk
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Produk PPOB" : "Tambah Produk PPOB"}</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            if (isEditing) {
              await updatePPOBProductAction(product.id, formData);
            } else {
              await createPPOBProductAction(formData);
            }
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label htmlFor="code">Kode Produk</Label>
                <Input id="code" name="code" defaultValue={product?.code} placeholder="TSEL10" required />
             </div>
             <div className="grid gap-2">
                <Label htmlFor="category">Kategori</Label>
                <Select name="category" defaultValue={product?.category || "pulsa"}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pulsa">Pulsa</SelectItem>
                        <SelectItem value="data">Paket Data</SelectItem>
                        <SelectItem value="pln">Token PLN</SelectItem>
                        <SelectItem value="pdam">PDAM</SelectItem>
                        <SelectItem value="ewallet">E-Wallet</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Nama Produk</Label>
            <Input id="name" name="name" defaultValue={product?.name} placeholder="Pulsa Tsel 10k" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="provider">Provider / Operator</Label>
            <Input id="provider" name="provider" defaultValue={product?.provider} placeholder="Telkomsel, PLN, dll" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price_base">Harga Dasar (Beli)</Label>
              <Input id="price_base" name="price_base" type="number" defaultValue={product?.price_base || 0} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price_sell">Harga Jual (Anggota)</Label>
              <Input id="price_sell" name="price_sell" type="number" defaultValue={product?.price_sell || 0} required />
            </div>
          </div>
          
          <div className="grid gap-2">
              <Label htmlFor="admin_fee">Biaya Admin Tambahan</Label>
              <Input id="admin_fee" name="admin_fee" type="number" defaultValue={product?.admin_fee || 0} />
              <p className="text-xs text-muted-foreground">Opsional, jika ada biaya admin spesifik per produk.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" name="description" defaultValue={product?.description} />
          </div>

          {isEditing && (
             <div className="flex items-center space-x-2">
                <input type="checkbox" id="is_active" name="is_active" value="true" defaultChecked={product?.is_active} className="h-4 w-4" />
                <Label htmlFor="is_active">Aktif</Label>
             </div>
          )}

          <div className="flex justify-end pt-4">
            <SubmitButton label={isEditing ? "Simpan Perubahan" : "Tambah Produk"} />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
