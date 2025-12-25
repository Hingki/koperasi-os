import { RentalItemForm } from '../rental-item-form';

export default function NewRentalItemPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tambah Unit Baru</h1>
        <p className="text-sm text-slate-500">
          Masukkan data unit sewa baru ke dalam sistem
        </p>
      </div>

      <RentalItemForm />
    </div>
  );
}
