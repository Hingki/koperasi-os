import { SupabaseClient } from '@supabase/supabase-js';
import { AccountingService } from './accounting-service';
import { SavingsService } from './savings-service';
import { AccountCode } from '@/lib/types/ledger';

export class MemberService {
  constructor(private supabase: SupabaseClient) { }

  /**
   * Process Member Resignation
   * 1. Validate no outstanding loans
   * 2. Calculate total savings refund
   * 3. Process refund (Journal Entry + Cash/Transfer)
   * 4. Close savings accounts
   * 5. Deactivate member and user
   */
  async resignMember(
    memberId: string,
    koperasiId: string,
    reason: string,
    userId: string,
    refundMethod: 'cash' | 'transfer' = 'cash'
  ) {
    // 1. Validation: Check Outstanding Loans
    const { data: loans, error: loanError } = await this.supabase
      .from('loans')
      .select('id, status, remaining_principal')
      .eq('member_id', memberId)
      .in('status', ['active']); // 'overdue' is not in enum, assuming 'active' covers it or 'defaulted'

    if (loanError) throw loanError;
    if (loans && loans.length > 0) {
      throw new Error(`Cannot resign: Member has ${loans.length} outstanding loans.`);
    }

    // Check pending loan applications
    const { data: apps, error: appError } = await this.supabase
      .from('loan_applications')
      .select('id')
      .eq('member_id', memberId)
      .eq('status', 'approved'); // Approved but not disbursed

    if (appError) throw appError;
    if (apps && apps.length > 0) {
      throw new Error('Cannot resign: Member has approved loan applications pending disbursement.');
    }

    // 2. Calculate Savings Refund & Gather Accounts
    const { data: savingsAccounts, error: savingsError } = await this.supabase
      .from('savings_accounts')
      .select(`
        id, 
        balance, 
        product:savings_products(type, name)
      `)
      .eq('member_id', memberId)
      .eq('status', 'active');

    if (savingsError) throw savingsError;

    let totalRefund = 0;
    const refundDetails: { accountId: string; amount: number; type: string; name: string }[] = [];

    if (savingsAccounts) {
      for (const acc of savingsAccounts) {
        if (acc.balance > 0) {
          totalRefund += acc.balance;
          refundDetails.push({
            accountId: acc.id,
            amount: acc.balance,
            type: (acc.product as any).type,
            name: (acc.product as any).name
          });
        }
      }
    }

    // 3. Process Refund (Ledger Entry)
    // We create one combined journal entry for the resignation
    if (totalRefund > 0) {
      const journalLines = [];

      // Debits (Liabilities decreasing)
      for (const detail of refundDetails) {
        const accountCode = this.mapProductToLiabilityAccount(detail.type);
        const accountId = await AccountingService.getAccountIdByCode(koperasiId, accountCode, this.supabase);

        if (!accountId) {
          throw new Error(`Accounting setup error: Account code ${accountCode} not found.`);
        }

        journalLines.push({
          account_id: accountId,
          debit: detail.amount,
          credit: 0
        });
      }

      // Credit (Asset decreasing: Cash/Bank)
      const creditAccountCode = refundMethod === 'cash' ? AccountCode.CASH_ON_HAND : AccountCode.BANK_BRI; // Defaulting to BRI for transfer for now
      const creditAccountId = await AccountingService.getAccountIdByCode(koperasiId, creditAccountCode, this.supabase);

      if (!creditAccountId) {
        throw new Error(`Accounting setup error: Payment account ${creditAccountCode} not found.`);
      }

      journalLines.push({
        account_id: creditAccountId,
        debit: 0,
        credit: totalRefund
      });

      // Post Journal
      await AccountingService.postJournal({
        koperasi_id: koperasiId,
        business_unit: 'SIMPAN_PINJAM',
        transaction_date: new Date().toISOString().split('T')[0],
        description: `Pengembalian Simpanan - Resign Member ${memberId}`,
        reference_id: memberId,
        reference_type: 'MEMBER_RESIGNATION',
        lines: journalLines,
        created_by: userId
      }, this.supabase);
    }

    // 4. Close Savings Accounts & Zero Balance
    // We update balances to 0 directly since we handled ledger above.
    // Or strictly we should create 'withdrawal' transactions for history?
    // Creating transactions is better for audit trail of the savings account itself.

    const savingsService = new SavingsService(this.supabase);
    for (const detail of refundDetails) {
      // Use skipLedger=true because we posted the combined journal above
      // Or we could let savingsService do it, but then we get multiple journal entries.
      // Combined is cleaner for "Resignation".
      // But we need to insert savings_transactions to zero out the balance view.

      await this.supabase.from('savings_transactions').insert({
        koperasi_id: koperasiId,
        account_id: detail.accountId,
        member_id: memberId,
        type: 'withdrawal',
        amount: -detail.amount,
        balance_after: 0,
        description: 'Closing Account - Member Resignation',
        created_by: userId
      });

      // Update Status ONLY (Balance updated by Ledger Trigger)
      const { error: updateError } = await this.supabase.from('savings_accounts').update({
        // balance: 0, // Handled by Trigger
        status: 'closed',
        closed_at: new Date().toISOString()
      }).eq('id', detail.accountId);

      if (updateError && updateError.message.includes('column')) {
        await this.supabase.from('savings_accounts').update({
          status: 'closed'
        }).eq('id', detail.accountId);
      } else if (updateError) {
        throw updateError;
      }
    }

    // Close empty accounts too
    const emptyAccountIds = savingsAccounts
      ?.filter(a => a.balance === 0)
      .map(a => a.id) || [];

    if (emptyAccountIds.length > 0) {
      const { error: closeError } = await this.supabase.from('savings_accounts').update({
        status: 'closed',
        closed_at: new Date().toISOString()
      }).in('id', emptyAccountIds);

      if (closeError && closeError.message.includes('column')) {
        await this.supabase.from('savings_accounts').update({
          status: 'closed'
        }).in('id', emptyAccountIds);
      } else if (closeError) {
        throw closeError;
      }
    }

    // 5. Deactivate Member & User Role
    const { error: memberUpdateError, count } = await this.supabase
      .from('member')
      .update({
        status: 'resigned',
        resigned_at: new Date().toISOString(),
        resignation_reason: reason
      })
      .eq('id', memberId)
      .select('id');

    console.log('Update Member Status Result:', { error: memberUpdateError, count });

    if (memberUpdateError) {
      // If error is about missing columns, try without them (backward compatibility if migration not run)
      if (memberUpdateError.message.includes('column') || memberUpdateError.message.includes('enum')) {
        console.warn('Migration missing for resignation fields/status. Falling back to basic update.');
        const { error: fallbackError } = await this.supabase
          .from('member')
          .update({
            status: 'inactive', // Fallback to 'inactive' if 'resigned' is not in enum
          })
          .eq('id', memberId);

        if (fallbackError) {
          console.error('Fallback update failed:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw memberUpdateError;
      }
    }

    // Deactivate User Role
    await this.supabase
      .from('user_role')
      .update({
        is_active: false,
        valid_until: new Date().toISOString()
      })
      .eq('member_id', memberId);

    return {
      success: true,
      refund_amount: totalRefund,
      accounts_closed: (savingsAccounts?.length || 0)
    };
  }

  private mapProductToLiabilityAccount(type: string): AccountCode {
    switch (type) {
      case 'pokok': return AccountCode.SAVINGS_PRINCIPAL;
      case 'wajib': return AccountCode.SAVINGS_MANDATORY;
      case 'sukarela': return AccountCode.SAVINGS_VOLUNTARY;
      case 'rencana': return AccountCode.SAVINGS_PLANNED;
      case 'berjangka': return AccountCode.SAVINGS_TIME;
      default: return AccountCode.SAVINGS_VOLUNTARY;
    }
  }
}
