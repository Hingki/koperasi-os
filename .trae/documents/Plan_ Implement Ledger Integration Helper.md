# Implement Ledger Integration Helper (Phase 1A)

## 🎯 Goal
Create a reusable service (`LedgerService`) to handle Double Entry Accounting. This service will be the single point of truth for recording financial transactions, ensuring every Debit has a matching Credit.

## 📋 Context & Rules
- **Phase**: 1A (Ledger Layer)
- **Architecture**: Ledger-First.
- **Table**: `ledger_entry` (created in Phase 1 Foundation).
- **Logic**:
    - Input: `TransactionRequest` (Debit Account, Credit Account, Amount, Reference).
    - Validation: Amount > 0, Accounts exist.
    - Hashing: `hash_current = SHA256(prev_hash + entry_data)` (Blockchain-like integrity).
    - Idempotency: Check `idempotencyKey`.

## 🛠️ Implementation Plan

### 1. Type Definitions (`src/lib/types/ledger.ts`)
Define interfaces for:
- `LedgerTransaction`
- `AccountCode` (Enum/Union of standard COA codes like '1-1001' Cash, '1-1301' Loan Receivable).

### 2. Service Logic (`src/lib/services/ledger-service.ts`)
Implement `LedgerService` class:
- `recordTransaction(trx: LedgerTransaction)`:
    1.  Get current Accounting Period.
    2.  Get Previous Hash (from last entry).
    3.  Compute New Hash.
    4.  Insert 2 records:
        -   Debit Entry (Positive Amount)
        -   Credit Entry (Negative Amount? Or keep positive but mark 'credit'? -> **Standard**: Store positive, use `account_debit` vs `account_credit` columns in a single row? 
        -   **Correction**: The `ledger_entry` schema defined in `arsitektur-final.md` uses a SINGLE row for a pair?
        -   *Reviewing Schema*: 
            ```sql
            account_debit TEXT NOT NULL,
            account_credit TEXT NOT NULL,
            amount NUMERIC(15,2) NOT NULL,
            ```
            **Yes**, it simplifies double entry into a single row per transaction ID.
    5.  Insert into `ledger_entry`.

### 3. Integration with Loan Service
- Update `src/lib/services/loan-service.ts` to actually call `LedgerService`.

### 4. Update Todo
- Mark "Implement Ledger Integration Helper" as Completed.
