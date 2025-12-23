'use client';

import { useState } from 'react';
import { PaymentSource } from '@/lib/types/master';
import { upsertPaymentSource, deletePaymentSource } from '@/lib/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  sources: PaymentSource[];
  unitUsahaOptions: { id: string; nama_unit: string }[];
}

export function PaymentSourcesManager({ sources, unitUsahaOptions }: Props) {
  const [list, setList] = useState<PaymentSource[]>(sources);
  const [name, setName] = useState<string>('');
  const [method, setMethod] = useState<string>('cash');
  const [provider, setProvider] = useState<string>('manual');
  const [unitUsahaId, setUnitUsahaId] = useState<string>('');
  const [accountCode, setAccountCode] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolder, setAccountHolder] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set('name', name);
    fd.set('method', method);
    fd.set('provider', provider);
    if (unitUsahaId) fd.set('unit_usaha_id', unitUsahaId);
    if (accountCode) fd.set('account_code', accountCode);
    if (bankName) fd.set('bank_name', bankName);
    if (accountNumber) fd.set('account_number', accountNumber);
    if (accountHolder) fd.set('account_holder', accountHolder);
    if (isActive) fd.set('is_active', 'on');
    try {
      const res = await upsertPaymentSource(fd);
      if (res.success) {
        setName('');
        setMethod('cash');
        setProvider('manual');
        setUnitUsahaId('');
        setAccountCode('');
        setBankName('');
        setAccountNumber('');
        setAccountHolder('');
        setIsActive(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setLoading(true);
    try {
      const res = await deletePaymentSource(id);
      if (res.success) {
        setList(list.filter(s => s.id !== id));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="grid gap-3 max-w-2xl">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Nama Sumber Bayar</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Metode</label>
          <select className="border rounded px-3 py-2" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="va">VA</option>
            <option value="savings_balance">Saldo Simpanan</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        
        {method === 'transfer' && (
          <>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Nama Bank</label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: BCA" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Nomor Rekening</label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Contoh: 1234567890" />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm font-medium">Atas Nama</label>
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Contoh: Koperasi Merah Putih" />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Provider</label>
          <select className="border rounded px-3 py-2" value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="manual">Manual</option>
            <option value="mock">Mock</option>
            <option value="xendit">Xendit</option>
            <option value="midtrans">Midtrans</option>
            <option value="internal">Internal</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Unit Usaha</label>
          <select className="border rounded px-3 py-2" value={unitUsahaId} onChange={(e) => setUnitUsahaId(e.target.value)}>
            <option value="">Semua</option>
            {unitUsahaOptions.map(u => (
              <option key={u.id} value={u.id}>{u.nama_unit}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">Kode Akun (COA)</label>
          <Input value={accountCode} onChange={(e) => setAccountCode(e.target.value)} placeholder="contoh: 1-1001" />
        </div>
        <div className="flex items-center gap-2">
          <input id="ps_active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <label htmlFor="ps_active" className="text-sm">Aktif</label>
        </div>
        <div>
          <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Tambah'}</Button>
        </div>
      </form>

      <div className="bg-white border rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-3">Nama</th>
              <th className="text-left p-3">Metode</th>
              <th className="text-left p-3">Provider</th>
              <th className="text-left p-3">Unit</th>
              <th className="text-left p-3">COA</th>
              <th className="text-left p-3">Aktif</th>
              <th className="text-left p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-3">
                  <div>{s.name}</div>
                  {s.method === 'transfer' && (
                    <div className="text-xs text-slate-500">
                      {s.bank_name} - {s.account_number}
                    </div>
                  )}
                </td>
                <td className="p-3">{s.method}</td>
                <td className="p-3">{s.provider}</td>
                <td className="p-3">{unitUsahaOptions.find(u => u.id === s.unit_usaha_id)?.nama_unit || '-'}</td>
                <td className="p-3">{s.account_code || '-'}</td>
                <td className="p-3">{s.is_active ? 'Ya' : 'Tidak'}</td>
                <td className="p-3">
                  <Button variant="outline" onClick={() => onDelete(s.id)} disabled={loading}>Hapus</Button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={7}>Belum ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
