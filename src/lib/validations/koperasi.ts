import { z } from 'zod';

export const koperasiSchema = z.object({
  nama: z.string().min(3, "Nama koperasi harus diisi"),
  nomor_badan_hukum: z.string().min(1, "Nomor badan hukum harus diisi"),
  tanggal_berdiri: z.string(),
  alamat: z.string().min(5, "Alamat harus diisi"),
  kelurahan: z.string().min(1, "Kelurahan harus diisi"),
  kecamatan: z.string().min(1, "Kecamatan harus diisi"),
  kota: z.string().min(1, "Kota/Kabupaten harus diisi"),
  provinsi: z.string().min(1, "Provinsi harus diisi"),
  kode_pos: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  npwp: z.string().optional().nullable(),
  siup: z.string().optional().nullable(),
});

export type KoperasiFormData = z.infer<typeof koperasiSchema>;
