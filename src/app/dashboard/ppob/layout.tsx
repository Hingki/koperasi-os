import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PPOBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Layanan PPOB</h2>
      </div>
      <div className="flex space-x-2 border-b pb-4">
        <Link href="/dashboard/ppob">
          <Button variant="ghost">Transaksi</Button>
        </Link>
        <Link href="/dashboard/ppob/products">
          <Button variant="ghost">Produk & Harga</Button>
        </Link>
        <Link href="/dashboard/ppob/settings">
          <Button variant="ghost">Pengaturan</Button>
        </Link>
      </div>
      {children}
    </div>
  );
}
