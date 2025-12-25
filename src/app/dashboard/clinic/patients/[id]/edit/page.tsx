import { createClient } from '@/lib/supabase/server';
import { PatientForm } from '@/components/clinic/patient-form';
import { notFound } from 'next/navigation';

export default async function EditPatientPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  
  const { data: patient } = await supabase
    .from('retail_customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!patient) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Data Pasien</h1>
        <p className="text-muted-foreground">Perbarui informasi pasien.</p>
      </div>
      <PatientForm mode="edit" initialData={patient} />
    </div>
  );
}
