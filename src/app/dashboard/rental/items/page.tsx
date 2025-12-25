import { getRentalItemsAction } from "@/lib/actions/rental";
import { AddItemDialog } from "@/components/rental/add-item-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function RentalItemsPage() {
  const { data: items, error } = await getRentalItemsAction();

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Daftar Aset Sewa</h3>
        <AddItemDialog />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Harga / Jam</TableHead>
              <TableHead>Harga / Hari</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.code && <div className="text-xs text-muted-foreground">{item.code}</div>}
                </TableCell>
                <TableCell>{item.category?.name || "-"}</TableCell>
                <TableCell>
                  <Badge variant={item.condition === "good" ? "outline" : "destructive"}>
                    {item.condition}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === "available" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(item.price_per_hour)}</TableCell>
                <TableCell>{formatCurrency(item.price_per_day)}</TableCell>
              </TableRow>
            ))}
            {items?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Belum ada data aset.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
