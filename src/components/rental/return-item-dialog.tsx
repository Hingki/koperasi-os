"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { returnRentalItemAction } from "@/lib/actions/rental";
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
import { CheckCircle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Memproses..." : "Selesaikan Sewa"}
    </Button>
  );
}

export function ReturnItemDialog({ booking }: { booking: any }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle className="w-4 h-4 mr-2" /> Selesai / Kembali
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pengembalian Barang</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await returnRentalItemAction(booking.id, formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="p-4 bg-muted rounded-md text-sm">
            <p><strong>Barang:</strong> {booking.item?.name}</p>
            <p><strong>Penyewa:</strong> {booking.customer?.name}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="condition">Kondisi Saat Kembali</Label>
            <Select name="condition" defaultValue="good">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">Baik (Good)</SelectItem>
                <SelectItem value="maintenance">Perlu Perawatan</SelectItem>
                <SelectItem value="damaged">Rusak (Damaged)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="late_fee">Denda Keterlambatan</Label>
              <Input id="late_fee" name="late_fee" type="number" defaultValue="0" min="0" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="damage_fee">Denda Kerusakan</Label>
              <Input id="damage_fee" name="damage_fee" type="number" defaultValue="0" min="0" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Catatan Pengembalian</Label>
            <Textarea id="notes" name="notes" placeholder="Catatan kondisi barang dsb." />
          </div>

          <div className="flex justify-end pt-4">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
