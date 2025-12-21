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

// Schema for Registration Form (Public)
export const memberRegistrationSchema = z.object({
  nama_lengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nik: z.string().length(16, "NIK harus 16 digit"),
  phone: z.string().min(10, "Nomor HP tidak valid"),
  email: z.string().email("Email tidak valid").optional(),
  alamat_lengkap: z.string().min(10, "Alamat lengkap minimal 10 karakter"),
  member_type: z.enum(['regular', 'honorary', 'family', 'student', 'staff']).optional(),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;

export function safeValidateMemberRegistration(data: unknown) {
  return memberRegistrationSchema.safeParse(data);
}
