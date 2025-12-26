'use client';

import { useState } from 'react';
import type { UserRole, UserRoleType } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MemberOption {
  id: string;
  nama_lengkap: string;
  nomor_anggota: string;
}

export interface UserRoleWithMember extends UserRole {
  member?: {
    nama_lengkap?: string | null;
    nomor_anggota?: string | null;
  } | null;
}

interface Props {
  initialRoles: UserRoleWithMember[];
  memberOptions: MemberOption[];
  koperasiId: string;
}

export function StaffManager({ initialRoles, memberOptions, koperasiId }: Props) {
  const [list, setList] = useState<UserRoleWithMember[]>(initialRoles || []);
  const [userId, setUserId] = useState<string>('');
  const [role, setRole] = useState<UserRoleType>('staff');
  const [memberId, setMemberId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  async function assignRole(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          koperasi_id: koperasiId,
          role,
          member_id: memberId || null,
          permissions: [],
          valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.error || 'Gagal menambahkan peran');
      }
      setList([data.data, ...list]);
      setUserId('');
      setRole('staff');
      setMemberId('');
      setValidUntil('');
      setMessage('Peran berhasil ditambahkan');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateRole(id: string, updates: Partial<UserRole>) {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          koperasi_id: koperasiId,
          is_active: updates.is_active,
          valid_until: updates.valid_until || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.error || 'Gagal memperbarui peran');
      }
      setList(list.map(r => r.id === id ? { ...r, ...updates } as UserRoleWithMember : r));
      setMessage('Peran berhasil diperbarui');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRole(id: string) {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ koperasi_id: koperasiId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.error || 'Gagal menghapus peran');
      }
      setList(list.filter(r => r.id !== id));
      setMessage('Peran berhasil dihapus');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={assignRole} className="grid gap-3 max-w-2xl">
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium">User ID</label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID pengguna" />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium" htmlFor="role_select">Peran</label>
          <select
            id="role_select"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 capitalize"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRoleType)}
            title="Peran pengguna"
          >
            <option value="staff">Staff</option>
            <option value="ketua">Ketua</option>
            <option value="wakil_ketua">Wakil Ketua</option>
            <option value="sekretaris">Sekretaris</option>
            <option value="bendahara">Bendahara</option>
            <option value="pengurus">Pengurus</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium" htmlFor="member_select">Anggota Terkait (opsional)</label>
          <select id="member_select" className="border rounded px-3 py-2" value={memberId} onChange={(e) => setMemberId(e.target.value)} title="Anggota terkait">
            <option value="">Tidak terkait</option>
            {memberOptions.map(m => (
              <option key={m.id} value={m.id}>
                {m.nama_lengkap} ({m.nomor_anggota})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <label className="text-sm font-medium" htmlFor="valid_until_input">Masa Berlaku Hingga</label>
          <input
            type="date"
            id="valid_until_input"
            className="border rounded px-3 py-2"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            title="Tanggal masa berlaku"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Tambah'}</Button>
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
      </form>

      <div className="bg-white border rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Peran</th>
              <th className="text-left p-3">Anggota</th>
              <th className="text-left p-3">Valid Sampai</th>
              <th className="text-left p-3">Aktif</th>
              <th className="text-left p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono text-xs">{r.user_id}</td>
                <td className="p-3 capitalize">{r.role}</td>
                <td className="p-3">{r.member?.nama_lengkap || '-'}</td>
                <td className="p-3">
                  <input
                    type="date"
                    className="border rounded px-2 py-1 text-sm"
                    value={r.valid_until ? new Date(r.valid_until).toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      updateRole(r.id, { valid_until: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<UserRole>)
                    }
                    disabled={loading}
                    title="Tanggal masa berlaku"
                    placeholder="YYYY-MM-DD"
                  />
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={r.is_active}
                    onChange={(e) => updateRole(r.id, { is_active: e.target.checked } as Partial<UserRole>)}
                    disabled={loading}
                    title="Aktif"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => deleteRole(r.id)} disabled={loading}>Hapus</Button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={6}>Belum ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
