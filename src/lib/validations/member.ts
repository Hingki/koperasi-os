import { z } from 'zod';

export const createMemberSchema = z.object({
  nama_lengkap: z.string().min(3, "Name must be at least 3 characters"),
  nik: z.string().length(16, "NIK must be 16 characters"),
  phone: z.string().min(10, "Phone number must be valid"),
  alamat_lengkap: z.string().min(5, "Address required"),
  nama_ibu_kandung: z.string().optional(),
  tempat_lahir: z.string().optional(),
  tanggal_lahir: z.string().optional(), // YYYY-MM-DD
  pekerjaan: z.string().optional(),
});

export type CreateMemberPayload = z.infer<typeof createMemberSchema>;
