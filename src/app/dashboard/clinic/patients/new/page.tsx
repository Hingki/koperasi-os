import { PatientForm } from '@/components/clinic/patient-form';

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pendaftaran Pasien Baru</h1>
        <p className="text-muted-foreground">Isi formulir lengkap untuk mendaftarkan pasien baru.</p>
      </div>
      <PatientForm mode="create" />
    </div>
  );
}
