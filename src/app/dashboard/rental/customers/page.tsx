import { getRentalCustomersAction } from "@/lib/actions/rental";
import { AddCustomerDialog } from "@/components/rental/add-customer-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RentalCustomersPage() {
  const { data: customers, error } = await getRentalCustomersAction();

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Data Penyewa</h3>
        <AddCustomerDialog />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>No. Identitas</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Bergabung Sejak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer: any) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.identity_number || "-"}</TableCell>
                <TableCell>{customer.phone || "-"}</TableCell>
                <TableCell>{customer.address || "-"}</TableCell>
                <TableCell>{new Date(customer.created_at).toLocaleDateString("id-ID")}</TableCell>
              </TableRow>
            ))}
            {customers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Belum ada data penyewa.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
