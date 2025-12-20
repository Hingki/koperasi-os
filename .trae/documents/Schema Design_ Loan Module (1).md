# Database Schema Design: Loan Module

Based on the review of `arsitektur-final.md`, there is no existing `pinjaman` (loan) table defined in the core schema. We will create two new tables: `loan_products` and `loan_applications`.

## 1. Review of Existing Schema
*   **Existing Tables**: `koperasi`, `member`, `user_role`, `accounting_period`, `unit_usaha`, `ledger_entry`, `chart_of_accounts`.
*   **Missing**: Specific tables for `pinjaman` (Loans) or `simpanan` (Savings).
*   **Integration Points**:
    *   `koperasi_id` for multi-tenancy.
    *   `member_id` for linking to members.
    *   `auth.users` for tracking `created_by` / `updated_by`.

## 2. Table Design: `loan_products`

This table defines the rules and configuration for different types of loans (e.g., "Pinjaman Reguler", "Pinjaman Urgent").

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `koperasi_id` | UUID | FK to `koperasi` |
| `code` | TEXT | Unique code (e.g., 'KMK-001') |
| `name` | TEXT | Display name |
| `description` | TEXT | Optional description |
| `interest_rate` | NUMERIC(5,2) | Annual interest rate (e.g., 12.00) |
| `interest_type` | ENUM | `flat`, `effective`, `annuity` |
| `min_amount` | NUMERIC(15,2) | Minimum loan amount |
| `max_amount` | NUMERIC(15,2) | Maximum loan amount |
| `min_duration` | INTEGER | Minimum duration (months/weeks) |
| `max_duration` | INTEGER | Maximum duration (months/weeks) |
| `duration_type` | ENUM | `weekly`, `monthly`, `yearly` |
| `collateral_required` | BOOLEAN | **[NEW]** Is collateral required? |
| `approval_workflow` | ENUM | **[NEW]** `simple`, `multi_level` |
| `penalty_late_rate` | NUMERIC(5,2) | Late penalty rate |
| `admin_fee_fixed` | NUMERIC(15,2) | Fixed admin fee |
| `admin_fee_pct` | NUMERIC(5,2) | Percentage admin fee |
| `is_active` | BOOLEAN | Soft delete flag |

## 3. Table Design: `loan_applications`

This table tracks the lifecycle of a loan request from draft to disbursement.

| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `koperasi_id` | UUID | FK to `koperasi` |
| `member_id` | UUID | FK to `member` |
| `product_id` | UUID | FK to `loan_products` |
| `app_number` | TEXT | Unique Application Number |
| `amount_requested` | NUMERIC | Amount requested by member |
| `duration_requested`| INTEGER | Duration requested |
| `purpose` | TEXT | Usage purpose |
| `status` | ENUM | `draft`, `submitted`, `survey`, `committee_review`, `approved`, `rejected`, `disbursed` |
| `survey_data` | JSONB | **[NEW]** Flexible field for survey results |
| `approved_amount` | NUMERIC | Final approved amount |
| `approved_duration` | INTEGER | Final approved duration |
| `approved_by` | UUID | FK to `auth.users` |
| `approved_at` | TIMESTAMPTZ | Approval timestamp |
| `rejected_reason` | TEXT | Reason for rejection |
| `disbursed_at` | TIMESTAMPTZ | **[NEW]** When money was sent |
| `disbursed_by` | UUID | Who authorized disbursement |

## 4. Proposed Migration SQL

```sql
-- Enums
CREATE TYPE loan_interest_type AS ENUM ('flat', 'effective', 'annuity');
CREATE TYPE loan_duration_type AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE loan_workflow_type AS ENUM ('simple', 'multi_level');
CREATE TYPE loan_app_status AS ENUM (
  'draft', 'submitted', 'survey', 'committee_review', 
  'approved', 'rejected', 'disbursed', 'cancelled'
);

-- Loan Products
CREATE TABLE loan_products (
  -- ... standard fields ...
  collateral_required BOOLEAN DEFAULT false,
  approval_workflow loan_workflow_type DEFAULT 'simple',
  -- ... constraints ...
);

-- Loan Applications
CREATE TABLE loan_applications (
  -- ... standard fields ...
  status loan_app_status DEFAULT 'draft',
  -- ... constraints ...
);

-- Indexes
CREATE INDEX idx_loan_apps_member ON loan_applications(member_id);
CREATE INDEX idx_loan_apps_status ON loan_applications(status);
CREATE INDEX idx_loan_products_code ON loan_products(koperasi_id, code);
```

## 5. RLS Policies (Security)

*   **Loan Products**:
    *   `SELECT`: Public (Authenticated) can view `is_active=true`.
    *   `ALL`: Only `admin`, `ketua`, `pengurus` can manage.
*   **Loan Applications**:
    *   `SELECT`: Users can see **their own** (`created_by = auth.uid()`).
    *   `INSERT`: Users can create for themselves.
    *   `UPDATE`: Users can update only if `status = 'draft'`.
    *   `ALL`: Staff/Admin can view/update all.

I am ready to generate the final migration file. Proceed?