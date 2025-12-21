# Koperasi OS - Project Summary

## 🚀 Project Overview

**Koperasi OS** is a modern, web-based management system for Indonesian Cooperatives (Koperasi Simpan Pinjam). It handles the full lifecycle of membership, savings, loans, and double-entry accounting.

- **Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth).
- **Architecture**: Modular Monolith with Event-Driven Ledger.

## 📦 Core Modules Implemented

### 1. Membership Management

- **Features**: Registration, Profile Management, Role-based Access Control (Admin/Member).
- **Key Files**: `src/app/dashboard/members`, `src/app/portal`

### 2. Savings (Simpanan)

- **Features**: Product Configuration (Pokok, Wajib, Sukarela), Deposits, Withdrawals.
- **Integration**: All transactions automatically create Ledger Entries.
- **Key Files**: `src/lib/services/savings-service.ts`, `src/app/dashboard/savings`

### 3. Loans (Pinjaman)

- **Features**:
  - Loan Application (with Tenor & Interest calculation).
  - Approval Workflow (Submitted -> Reviewed -> Approved -> Disbursed).
  - Disbursement & Repayment (Principal + Interest separation).
  - **PDF Contract Generation**.
- **Key Files**: `src/lib/services/loan-service.ts`, `src/components/loans/LoanApprovalWorkflow.tsx`

### 4. General Ledger (Akuntansi)

- **Features**:
  - **Double-Entry Engine**: Ensures Assets = Liabilities + Equity.
  - **Chart of Accounts**: Standardized codes (1-Asset, 2-Liability, 4-Revenue, 5-Expense).
  - **Reports**: Balance Sheet (Neraca), Income Statement (Laba Rugi), General Journal.
- **Key Files**: `src/lib/services/ledger-service.ts`, `src/app/dashboard/accounting`

## 🛠️ Technical Highlights

### Database Schema (Supabase)

- **Tables**: `member`, `loan_products`, `loan_applications`, `savings_accounts`, `ledger_entries`, `unit_usaha`.
- **Security**: Row Level Security (RLS) policies enabled for all tables.
- **Migrations**: 10+ SQL migration files in `supabase/migrations/` ensuring reproducible schema.

### Testing & Quality

- **E2E Testing**: Playwright tests covering the full financial flow (`tests/e2e/loan-flow.spec.ts`).
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`) for automated build and test.

### Integrations

- **WhatsApp**: Notification service setup (mock ready for Twilio/WAbot).
- **PDF**: Client-side generation using `jspdf`.

## 🏃‍♂️ How to Run

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Setup**:

   - Ensure `.env.local` is configured with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

3. **Run Development Server**:

   ```bash
   npm run dev
   ```

   Access at `http://localhost:3000`.

4. **Run Tests**:

   ```bash
   npx playwright test
   ```

## 📂 Project Structure

```text
c:\koperasi-os\
├── src\
│   ├── app\            # Next.js App Router (Pages & Layouts)
│   ├── components\     # Reusable UI Components
│   ├── lib\            # Business Logic & Services (Ledger, Loans, etc.)
│   └── types\          # TypeScript Definitions
├── supabase\
│   └── migrations\     # Database Schema Definitions
├── tests\              # End-to-End Tests
└── public\             # Static Assets
```
