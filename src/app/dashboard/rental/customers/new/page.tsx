import { RentalCustomerForm } from '../rental-customer-form';

export default function NewRentalCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tambah Pelanggan Baru</h1>
        <p className="text-sm text-slate-500">
          Masukkan data pelanggan sewa baru (Non-Anggota)
        </p>
      </div>

      <RentalCustomerForm />
    </div>
  );
}
