import { CreateTicketForm } from './create-ticket-form';

export default function CreateTicketPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lapor Masalah</h1>
                <p className="text-slate-500">
                    Sampaikan kendala atau masukan anda terkait sistem koperasi.
                </p>
            </div>
            <div className="max-w-2xl">
                <CreateTicketForm />
            </div>
        </div>
    );
}
