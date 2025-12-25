"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createRentalBookingAction } from "@/lib/actions/rental";
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
import { formatCurrency } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Memproses..." : "Buat Booking"}
    </Button>
  );
}

export function AddBookingDialog({ items, customers }: { items: any[]; customers: any[] }) {
  const [open, setOpen] = useState(false);

  // Filter available items only
  const availableItems = items.filter((i) => i.status === "available");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Booking Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Booking Baru</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await createRentalBookingAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="item_id">Pilih Aset / Barang</Label>
            <Select name="item_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih aset..." />
              </SelectTrigger>
              <SelectContent>
                {availableItems.length === 0 ? (
                  <SelectItem value="none" disabled>Tidak ada aset tersedia</SelectItem>
                ) : (
                  availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {formatCurrency(item.price_per_day)}/hari
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer_id">Penyewa</Label>
            <Select name="customer_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih penyewa..." />
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <SelectItem value="none" disabled>Belum ada data penyewa</SelectItem>
                ) : (
                  customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.phone || "No Phone"})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_time">Mulai Sewa</Label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_time_planned">Rencana Selesai</Label>
              <Input
                id="end_time_planned"
                name="end_time_planned"
                type="datetime-local"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" name="notes" placeholder="Opsional" />
          </div>
          <div className="flex justify-end pt-4">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
