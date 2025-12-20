# Implement Loan Repayment Logic (Phase 1B)

## 🎯 Goal
Implement the logic for members to repay their loans. This involves processing installments, updating the loan balance, and recording the ledger entry (Cash In, Receivable Out).

## 📋 Context & Rules
- **Phase**: 1B (Loan Module)
- **Architecture**: Ledger-First.
- **Inputs**: `loanId`, `amount`.
- **Logic**:
    1.  **Find Unpaid Installments**: Get the oldest `pending` or `partial` schedule.
    2.  **Allocate Payment**:
        -   First covers Interest.
        -   Then covers Principal.
        -   (Ideally Penalties first, but sticking to basic for MVP).
    3.  **Update Schedule**: Mark as `paid` or `partial`.
    4.  **Update Loan**: Reduce `remaining_principal`.
    5.  **Ledger**: Debit Cash, Credit Loan Receivable.

## 🛠️ Implementation Plan

### 1. Service Logic (`src/lib/services/loan-service.ts`)
Add `processRepayment(loanId, amount, userId)`:
- Fetch Loan & Schedules (ordered by due_date).
- **Allocation Loop**:
    - Iterate through schedules.
    - Allocate amount against `total_installment - paid_amount`.
    - Update schedule status.
    - Stop when amount exhausted.
- **Update Loan**:
    - Recalculate `remaining_principal`.
    - If `remaining_principal <= 0`, set Loan status `paid`.
- **Ledger**:
    - `tx_type`: `loan_repayment`.
    - `account_debit`: `CASH_ON_HAND`.
    - `account_credit`: `LOAN_RECEIVABLE`.

### 2. API Endpoint (`src/app/api/loans/[id]/repay/route.ts`)
- **Auth**: Admin/Teller (or Member via Payment Gateway - assume Admin for now).
- **Response**: Updated Loan status.

### 3. Update Todo
- Mark "Implement Repayment Logic" as Completed.
