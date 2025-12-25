import { getPPOBProductsAdmin, deletePPOBProductAction } from "@/lib/actions/ppob-admin";
import { ProductDialog } from "@/components/ppob/product-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Edit } from "lucide-react";

export default async function PPOBProductsPage() {
  const { data: products } = await getPPOBProductsAdmin();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Daftar Produk PPOB</h3>
        <ProductDialog />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Harga Dasar</TableHead>
              <TableHead>Harga Jual</TableHead>
              <TableHead>Margin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono">{product.code}</TableCell>
                <TableCell className="uppercase text-xs font-bold text-muted-foreground">{product.category}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.provider}</TableCell>
                <TableCell>{formatCurrency(product.price_base)}</TableCell>
                <TableCell>{formatCurrency(product.price_sell)}</TableCell>
                <TableCell className="text-green-600 font-medium">
                    {formatCurrency(product.price_sell - product.price_base)}
                </TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <ProductDialog 
                        product={product} 
                        trigger={
                            <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                            </Button>
                        } 
                    />
                    <form action={deletePPOBProductAction.bind(null, product.id)}>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products?.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Belum ada produk PPOB. Silakan tambah produk baru.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
