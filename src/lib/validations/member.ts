import { z } from 'zod';

/**
 * Member Registration Validation Schema
 * 
 * Validates member registration data according to database schema requirements
 * and Indonesian data format standards (NIK, phone number).
 */

// NIK validation: 16 digits, numeric only
const nikSchema = z
  .string()
  .length(16, 'NIK harus terdiri dari 16 digit')
  .regex(/^\d+$/, 'NIK hanya boleh berisi angka');

// Indonesian phone number validation
// Format: 08xx-xxxx-xxxx atau +62xxx-xxxx-xxxx
const phoneSchema = z
  .string()
  .min(10, 'Nomor HP minimal 10 digit')
  .max(15, 'Nomor HP maksimal 15 digit')
  .regex(
    /^(\+62|62|0)[0-9]{9,13}$/,
    'Format nomor HP tidak valid. Gunakan format: 08xx-xxxx-xxxx atau +62xxx-xxxx-xxxx'
  )
  .transform((val) => {
    // Normalize phone number: remove dashes and spaces
    return val.replace(/[\s-]/g, '');
  });

// Email validation (optional field)
const emailSchema = z
  .string()
  .email('Format email tidak valid')
  .toLowerCase()
  .optional()
  .or(z.literal(''));

// Nama lengkap validation
const namaLengkapSchema = z
  .string()
  .min(3, 'Nama lengkap minimal 3 karakter')
  .max(100, 'Nama lengkap maksimal 100 karakter')
  .trim();

// Alamat lengkap validation
const alamatLengkapSchema = z
  .string()
  .min(10, 'Alamat lengkap minimal 10 karakter')
  .max(500, 'Alamat lengkap maksimal 500 karakter')
  .trim();

/**
 * Member Registration Schema
 * 
 * This schema validates the input for member registration.
 * It matches the database schema in supabase/migrations/20251214112545_001_create_core_tables.sql
 * 
 * Note: koperasi_id, nomor_anggota, user_id, created_by are set by the API/server,
 * not by the client.
 */
export const memberRegistrationSchema = z.object({
  nama_lengkap: namaLengkapSchema,
  nik: nikSchema,
  phone: phoneSchema,
  email: emailSchema,
  alamat_lengkap: alamatLengkapSchema,
  // Optional fields with defaults
  member_type: z
    .enum(['regular', 'honorary', 'family', 'student', 'staff'])
    .default('regular')
    .optional(),
});

/**
 * TypeScript type inferred from the schema
 */
export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;

/**
 * Member Registration Response Schema
 * 
 * Schema for the response after successful member registration
 */
export const memberRegistrationResponseSchema = z.object({
  id: z.string().uuid(),
  nomor_anggota: z.string(),
  nama_lengkap: z.string(),
  nik: z.string(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'archived']),
  created_at: z.string().datetime(),
});

export type MemberRegistrationResponse = z.infer<
  typeof memberRegistrationResponseSchema
>;

/**
 * Validation helper functions
 */
export function validateMemberRegistration(
  data: unknown
): MemberRegistrationInput {
  return memberRegistrationSchema.parse(data);
}

export function safeValidateMemberRegistration(
  data: unknown
): { success: true; data: MemberRegistrationInput } | { success: false; error: z.ZodError } {
  const result = memberRegistrationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}


