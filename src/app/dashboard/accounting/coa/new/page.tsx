import { CoaForm } from '../coa-form';

export default function NewAccountPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Akun Baru</h1>
        <p className="text-muted-foreground">
          Buat kode akun baru untuk struktur chart of accounts.
        </p>
      </div>

      <div className="rounded-md border bg-white p-6">
        <CoaForm />
      </div>
    </div>
  );
}
