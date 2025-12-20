# Database Schema Design: Active Loans (Phase 1B)

## 🎯 Goal
Create the schema to store **Active Loans** and their **Repayment Schedules**. This separates the "Application" (request) from the "Loan" (contract/financial asset).

## 📋 Context & Rules
- **Phase**: 1B (Loan Module)
- **Architecture**: Ledger-First.
- **Relationship**: One `loan_application` (approved) -> One `loans` record.
- **Financial Tracking**: Needs to track principal, interest, remaining balance, and penalties.

## 🛠️ Implementation Plan

### 1. Table: `loans`
Represents the active loan contract.
- `id`: UUID
- `application_id`: FK to `loan_applications` (1:1)
- `member_id`: FK to `member`
- `product_id`: FK to `loan_products`
- `loan_code`: String (e.g., 'LOAN-2024-001')
- **Financials**:
  - `principal_amount`: Numeric (Amount disbursed)
  - `interest_rate`: Numeric (Snapshot from product)
  - `total_interest`: Numeric (Calculated total interest)
  - `total_amount_repayable`: Numeric (Principal + Interest)
  - `remaining_principal`: Numeric
  - `status`: Enum (`active`, `paid`, `defaulted`, `written_off`)
- **Dates**:
  - `start_date`: Date (Disbursement date)
  - `due_date`: Date (Final maturity date)

### 2. Table: `loan_repayment_schedule`
Tracks each installment.
- `id`: UUID
- `loan_id`: FK to `loans`
- `installment_number`: Integer (1, 2, 3...)
- `due_date`: Date
- `principal_portion`: Numeric
- `interest_portion`: Numeric
- `total_installment`: Numeric
- `status`: Enum (`pending`, `paid`, `overdue`, `partial`)
- `paid_amount`: Numeric (Default 0)
- `paid_at`: Timestamptz

### 3. RLS Policies
- **Members**: Can view their own loans and schedules.
- **Admins/Pengurus**: Can view/manage all.

### 4. Migration File
Create `supabase/migrations/20251220140000_create_active_loans.sql`.
