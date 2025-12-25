import { getPPOBTransactionsAdmin } from "@/lib/actions/ppob-admin";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PPOBTransactionsPage() {
  const { data: transactions } = await getPPOBTransactionsAdmin();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Riwayat Transaksi</h3>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Anggota</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Nomor Tujuan</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((tx: any) => (
              <TableRow key={tx.id}>
                <TableCell>{formatDate(tx.created_at)}</TableCell>
                <TableCell>{tx.member?.nama_lengkap || "Umum"}</TableCell>
                <TableCell>
                  <div className="font-medium">{tx.product_name}</div>
                  <div className="text-xs text-muted-foreground uppercase">{tx.category} - {tx.provider}</div>
                </TableCell>
                <TableCell className="font-mono">{tx.customer_number}</TableCell>
                <TableCell>{formatCurrency(tx.price)}</TableCell>
                <TableCell>{formatCurrency(tx.admin_fee)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(tx.total_amount)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      tx.status === "success"
                        ? "default"
                        : tx.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {tx.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {transactions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Belum ada transaksi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
