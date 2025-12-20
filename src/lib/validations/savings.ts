import { z } from 'zod';

export const savingsTransactionSchema = z.object({
  accountId: z.string().uuid({ message: "Invalid Account ID" }),
  amount: z.number().positive({ message: "Amount must be positive" }),
  type: z.enum(['deposit', 'withdrawal']),
  description: z.string().optional()
});

export type SavingsTransactionPayload = z.infer<typeof savingsTransactionSchema>;
