export interface Member {
  id: string;
  koperasi_id: string;
  user_id?: string;
  nomor_anggota: string;
  nama_lengkap: string;
  nik: string;
  phone: string;
  email?: string;
  alamat_lengkap?: string;
  status: 'active' | 'pending' | 'inactive' | 'blocked' | 'resigned';
  member_type?: string;
  tanggal_daftar: string;
  created_at: string;
}
