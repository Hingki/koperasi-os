# Create Financial Reports UI (Phase 3)

## 🎯 Goal
Provide Admins with a real-time **Balance Sheet** (Neraca) and **Journal View** (Buku Besar) to track the cooperative's financial health.

## 📋 Context & Rules
- **Phase**: 3 (Reporting)
- **Data Source**: `ledger_entries` table.
- **Logic**:
    - **Balance Sheet**: Group by `account_code`.
        - **Assets**: 1-xxxx (Cash, Receivables).
        - **Liabilities**: 2-xxxx (Savings).
        - **Equity**: 3-xxxx (Retained Earnings).
    - **Journal**: List of latest transactions.

## 🛠️ Implementation Plan

### 1. Accounting Dashboard (`src/app/dashboard/accounting/page.tsx`)
- **Summary Cards**: Total Assets, Total Liabilities.
- **Recent Journal**: Table of last 10 ledger entries.

### 2. Balance Sheet Page (`src/app/dashboard/accounting/balance-sheet/page.tsx`)
- **Layout**: Two columns (Assets vs Liabilities + Equity).
- **Data Fetching**:
    - Fetch all entries.
    - Aggregate in-memory (for MVP, since SQL aggregation might be complex with Supabase JS client without a stored procedure).
    - *Better*: Use a simple SQL query if possible, or just fetch all and reduce in JS (Ledger table shouldn't be huge yet).

### 3. Journal Page (`src/app/dashboard/accounting/journal/page.tsx`)
- **Table**: Date, Reference, Account, Debit, Credit, Description.
- **Filter**: Date Range.

### 4. Update Todo
- Mark "Create Financial Reports" as Completed.
