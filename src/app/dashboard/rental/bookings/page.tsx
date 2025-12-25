import { getRentalBookingsAction, getRentalItemsAction, getRentalCustomersAction } from "@/lib/actions/rental";
import { AddBookingDialog } from "@/components/rental/add-booking-dialog";
import { ReturnItemDialog } from "@/components/rental/return-item-dialog";
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

export default async function RentalBookingsPage() {
  const [{ data: bookings }, { data: items }, { data: customers }] = await Promise.all([
    getRentalBookingsAction(),
    getRentalItemsAction(),
    getRentalCustomersAction(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Daftar Booking & Transaksi</h3>
        <AddBookingDialog items={items || []} customers={customers || []} />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Booking</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Penyewa</TableHead>
              <TableHead>Waktu Sewa</TableHead>
              <TableHead>Total Harga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings?.map((booking: any) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs">{booking.booking_code}</TableCell>
                <TableCell>{booking.item?.name}</TableCell>
                <TableCell>
                  <div className="font-medium">{booking.customer?.name}</div>
                  <div className="text-xs text-muted-foreground">{booking.customer?.phone}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDate(booking.start_time)} - {formatDate(booking.end_time_planned)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {booking.duration_days > 0 ? `${booking.duration_days} Hari` : `${booking.duration_hours} Jam`}
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      booking.status === "completed"
                        ? "default"
                        : booking.status === "booked" || booking.status === "active"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(booking.status === "booked" || booking.status === "active") && (
                    <ReturnItemDialog booking={booking} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {bookings?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Belum ada booking.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
