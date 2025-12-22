import { AccountCode } from '@/lib/types/ledger';

export default function ConfigPage() {
  const mappings = Object.entries(AccountCode).map(([key, value]) => ({
    key: key.replace(/_/g, ' '),
    code: value
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Akuntansi</h1>
        <p className="text-muted-foreground">
          Mapping akun sistem (Hardcoded System Accounts). Pastikan kode akun ini ada di COA.
        </p>
      </div>

      <div className="rounded-md border bg-white">
        <div className="p-4 border-b">
            <h3 className="font-semibold">System Account Mappings</h3>
        </div>
        <div className="p-0">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-medium">
                    <tr>
                        <th className="px-4 py-3">Fungsi Sistem</th>
                        <th className="px-4 py-3">Kode Akun Wajib</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {mappings.map((item) => (
                        <tr key={item.key}>
                            <td className="px-4 py-3 font-medium">{item.key}</td>
                            <td className="px-4 py-3 font-mono text-blue-600">{item.code}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
