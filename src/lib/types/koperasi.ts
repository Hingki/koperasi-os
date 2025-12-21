export interface Koperasi {
  id: string;
  nama: string;
  nomor_badan_hukum: string;
  tanggal_berdiri: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kode_pos?: string;
  phone?: string;
  email?: string;
  website?: string;
  npwp?: string;
  siup?: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
