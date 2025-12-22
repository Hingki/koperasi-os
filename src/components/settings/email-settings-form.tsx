'use client';

import { useState } from 'react';
import { EmailSettings } from '@/lib/types/master';
import { updateEmailSettings } from '@/lib/actions/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  initialData: EmailSettings | null;
}

export function EmailSettingsForm({ initialData }: Props) {
  const [provider, setProvider] = useState<string>(initialData?.provider || 'smtp');
  const [smtpHost, setSmtpHost] = useState<string>(initialData?.smtp_host || '');
  const [smtpPort, setSmtpPort] = useState<string>(String(initialData?.smtp_port || 587));
  const [smtpUser, setSmtpUser] = useState<string>(initialData?.smtp_username || '');
  const [smtpPass, setSmtpPass] = useState<string>(initialData?.smtp_password || '');
  const [fromName, setFromName] = useState<string>(initialData?.from_name || '');
  const [fromEmail, setFromEmail] = useState<string>(initialData?.from_email || '');
  const [isActive, setIsActive] = useState<boolean>(!!initialData?.is_active);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const fd = new FormData();
    fd.set('provider', provider);
    fd.set('smtp_host', smtpHost);
    fd.set('smtp_port', smtpPort);
    fd.set('smtp_username', smtpUser);
    fd.set('smtp_password', smtpPass);
    fd.set('from_name', fromName);
    fd.set('from_email', fromEmail);
    if (isActive) fd.set('is_active', 'on');
    try {
      const res = await updateEmailSettings(fd);
      if (res.success) {
        setMessage('Berhasil menyimpan pengaturan email');
      } else {
        setMessage('Gagal menyimpan pengaturan email');
      }
    } catch (err: unknown) {
      setMessage('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">Provider</label>
        <select className="border rounded px-3 py-2" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="smtp">SMTP</option>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">SMTP Host</label>
        <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">SMTP Port</label>
        <Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">SMTP Username</label>
        <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">SMTP Password</label>
        <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">From Name</label>
        <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">From Email</label>
        <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <input id="is_active" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <label htmlFor="is_active" className="text-sm">Aktifkan</label>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </div>
    </form>
  );
}
