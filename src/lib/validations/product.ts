import { z } from 'zod';

export const loanProductSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  interest_rate: z.coerce.number().min(0, "Interest rate cannot be negative").max(100),
  interest_type: z.enum(['flat', 'effective', 'annuity']),
  max_tenor_months: z.coerce.number().int().min(1, "Tenor must be at least 1 month"),
  min_amount: z.coerce.number().min(0, "Minimum amount cannot be negative"),
  max_amount: z.coerce.number().min(0, "Maximum amount cannot be negative"),
  admin_fee: z.coerce.number().min(0).default(0),
  provision_fee: z.coerce.number().min(0).default(0),
  penalty_late_daily: z.coerce.number().min(0).default(0),
  is_active: z.coerce.boolean().default(true),
}).refine(data => data.max_amount >= data.min_amount, {
  message: "Max amount must be greater than or equal to min amount",
  path: ["max_amount"],
});

export type LoanProductPayload = z.infer<typeof loanProductSchema>;

export const savingsProductSchema = z.object({
  code: z.string().min(3, "Kode minimal 3 karakter").max(20),
  name: z.string().min(3, "Nama minimal 3 karakter"),
  type: z.enum(['pokok', 'wajib', 'sukarela', 'berjangka']),
  description: z.string().optional(),
  interest_rate: z.coerce.number().min(0).max(100).default(0),
  min_balance: z.coerce.number().min(0).default(0),
  min_deposit: z.coerce.number().min(0).default(0),
  is_withdrawal_allowed: z.coerce.boolean().default(true),
  is_active: z.coerce.boolean().default(true),
});

export type SavingsProductPayload = z.infer<typeof savingsProductSchema>;
