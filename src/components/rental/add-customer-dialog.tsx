"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createRentalCustomerAction } from "@/lib/actions/rental";
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
import { Plus } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan..." : "Simpan Penyewa"}
    </Button>
  );
}

export function AddCustomerDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Tambah Penyewa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Data Penyewa</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createRentalCustomerAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input id="name" name="name" required placeholder="Nama Penyewa" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="identity_number">No. KTP / SIM</Label>
            <Input id="identity_number" name="identity_number" placeholder="Nomor Identitas" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">No. Telepon / WA</Label>
            <Input id="phone" name="phone" placeholder="08..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" placeholder="Alamat Domisili" />
          </div>
          <div className="flex justify-end pt-4">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
