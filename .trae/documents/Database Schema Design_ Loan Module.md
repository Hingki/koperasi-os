# Database Schema Design: Loan Module

## 1. Review Findings
- **Existing Schema**: The `arsitektur-final.md` defines Core tables (`koperasi`, `member`, `user_role`) and Ledger tables (`chart_of_accounts`, `ledger_entry`).
- **Missing Tables**: There is NO existing `pinjaman` or `loan` table. This module will be built from scratch.
- **Architecture Compliance**: All financial actions (disbursement, repayment) must eventually trigger `ledger_entry` (Phase 1A/B integration).

## 2. Proposed Schema Design

### A. ENUMs (Type Definitions)
Strict typing for status and business rules.
```sql
CREATE TYPE loan_interest_type AS ENUM ('flat', 'effective', 'declining');
CREATE TYPE loan_workflow_type AS ENUM ('simple', 'multi_level');
CREATE TYPE loan_application_status AS ENUM (
    'draft', 'submitted', 'survey', 'committee_review', 
    'approved', 'rejected', 'disbursed', 'completed', 'defaulted'
);
```

### B. Table: `loan_products`
Defines the rules for lending products (e.g., "Pinjaman Mikro", "Pinjaman Konsumtif").
```sql
CREATE TABLE loan_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    code TEXT NOT NULL, -- e.g., 'KMK-001'
    name TEXT NOT NULL,
    description TEXT,
    
    -- Interest & Terms
    interest_type loan_interest_type NOT NULL DEFAULT 'flat',
    interest_rate NUMERIC(5,2) NOT NULL, -- Annual percentage
    max_tenor_months INTEGER NOT NULL,
    min_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    max_amount NUMERIC(15,2) NOT NULL,
    
    -- Workflow Rules
    collateral_required BOOLEAN DEFAULT false,
    approval_workflow loan_workflow_type DEFAULT 'simple',
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(koperasi_id, code)
);
```

### C. Table: `loan_applications`
Tracks the lifecycle of a loan request from draft to disbursement.
```sql
CREATE TABLE loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    product_id UUID NOT NULL REFERENCES loan_products(id),
    
    -- Application Details
    amount NUMERIC(15,2) NOT NULL,
    tenor_months INTEGER NOT NULL,
    purpose TEXT,
    
    -- Status & Workflow
    status loan_application_status NOT NULL DEFAULT 'draft',
    workflow_metadata JSONB DEFAULT '{}'::jsonb, 
    -- Stores: { approved_by: uuid, rejected_reason: text, current_step: 1 }
    
    survey_data JSONB DEFAULT '{}'::jsonb,
    -- Stores: { surveyor_id: uuid, score: 85, notes: "Valid business" }
    
    -- Timestamps
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id), -- Usually the member
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. Security & Performance

### Indexes
- **loan_products**: `(koperasi_id, is_active)` for fast product lookups.
- **loan_applications**: 
    - `(member_id)` for "My Loans" list.
    - `(koperasi_id, status)` for "Pending Approval" dashboard.

### RLS Policies
1.  **loan_products**:
    - `SELECT`: Public/Authenticated (Members need to see what they can apply for).
    - `ALL`: Admin/Pengurus only.

2.  **loan_applications**:
    - `SELECT`: 
        - Users can see **their own** applications (`member_id` check or `created_by` check).
        - Admins/Pengurus can see **all** applications in their Koperasi.
    - `INSERT`: Authenticated users (for their own member profile).
    - `UPDATE`: 
        - Users can update ONLY if status is `draft`.
        - Admins/Pengurus can update status (approve/reject).

## 4. Next Steps
1.  Create migration file: `supabase/migrations/20251220100000_create_loan_module.sql`.
2.  Update `todo.md` to reflect Phase 1A / 1B split.
