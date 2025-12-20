# Implement Savings Deposit/Withdrawal Logic (Phase 1A)

## 🎯 Goal
Implement the transactional logic for Savings (Simpanan). This handles Member Deposits (Setor Tunai) and Withdrawals (Tarik Tunai), updating balances and recording to the General Ledger.

## 📋 Context & Rules
- **Phase**: 1A (Savings Module)
- **Architecture**: Ledger-First.
- **Inputs**: `accountId`, `amount`, `type`.
- **Logic**:
    - **Deposit**: 
        - Credit Savings Account (Liability increases).
        - Debit Cash (Asset increases).
    - **Withdrawal**:
        - Debit Savings Account (Liability decreases).
        - Credit Cash (Asset decreases).
        - **Check**: Balance >= Amount.
        - **Check**: `is_withdrawal_allowed` (e.g., cannot withdraw Pokok).

## 🛠️ Implementation Plan

### 1. Service Logic (`src/lib/services/savings-service.ts`)
- `processTransaction(accountId, amount, type, userId)`:
    1.  Fetch Account & Product.
    2.  **Withdrawal Validation**:
        -   Check balance.
        -   Check `is_withdrawal_allowed` (if type is 'pokok'/'wajib' and status is 'active').
    3.  **Perform Transaction**:
        -   Insert `savings_transactions`.
        -   Update `savings_accounts` balance.
    4.  **Ledger Integration**:
        -   Call `LedgerService`.
        -   Map to correct GL Accounts (e.g., `2-1001` for Sukarela).

### 2. API Endpoint (`src/app/api/savings/transact/route.ts`)
- **Auth**: Admin/Teller only.
- **Validation**: Zod schema.
- **Response**: Updated balance.

### 3. Update Todo
- Mark "Implement Deposit/Withdrawal Logic" as Completed.
