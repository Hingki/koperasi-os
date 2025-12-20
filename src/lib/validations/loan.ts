import { z } from 'zod';

export const loanApplicationSchema = z.object({
  productId: z.string().uuid({ message: "Product ID must be a valid UUID" }),
  amount: z.number().min(10000, { message: "Amount must be at least 10,000" }),
  tenorMonths: z.number().int().min(1, { message: "Tenor must be at least 1 month" }),
  purpose: z.string().min(10, { message: "Purpose must be at least 10 characters long" }),
});

export const loanWorkflowSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject'], { 
    errorMap: () => ({ message: "Action must be one of: submit, approve, reject" }) 
  }),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.action === 'reject' && (!data.notes || data.notes.length < 5)) {
    return false;
  }
  return true;
}, {
  message: "Notes are required when rejecting an application",
  path: ["notes"],
});

export const loanRepaymentSchema = z.object({
  amount: z.number().positive({ message: "Repayment amount must be positive" }),
});

export type LoanApplicationPayload = z.infer<typeof loanApplicationSchema>;
export type LoanWorkflowPayload = z.infer<typeof loanWorkflowSchema>;
export type LoanRepaymentPayload = z.infer<typeof loanRepaymentSchema>;
