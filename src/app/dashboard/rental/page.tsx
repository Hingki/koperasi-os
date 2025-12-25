import { redirect } from "next/navigation";

export default function RentalPage() {
  redirect("/dashboard/rental/bookings");
}
