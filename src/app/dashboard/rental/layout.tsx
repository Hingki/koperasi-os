import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RentalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Unit Usaha Sewa</h2>
      </div>
      <div className="flex space-x-2 border-b pb-4">
        <Link href="/dashboard/rental/bookings">
          <Button variant="ghost">Bookings & Transaksi</Button>
        </Link>
        <Link href="/dashboard/rental/items">
          <Button variant="ghost">Data Aset / Barang</Button>
        </Link>
        <Link href="/dashboard/rental/customers">
          <Button variant="ghost">Data Penyewa</Button>
        </Link>
      </div>
      {children}
    </div>
  );
}
