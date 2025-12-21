# Project Rules & Architecture Guidelines

## 1. Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Database & Auth:** Supabase
- **Styling:** Tailwind CSS + Shadcn UI
- **Icons:** Lucide React

## 2. Architecture Patterns

- **Service Layer:** All complex business logic MUST reside in `src/lib/services/` (e.g., `LoanService`, `LedgerService`, `RetailService`).
- **Server Actions:** Use Next.js Server Actions for data mutations (POST/PUT/DELETE). Locate in `src/lib/actions/`.
- **Client Components:** Use `'use client'` only when necessary (interactive UI). Prefer Server Components for data fetching.
- **Supabase Client:** Use `createClient` from `@/lib/supabase/server` for server components/actions, and `@/lib/supabase/client` for client components.

## 3. Business Logic Standards

- **Accounting Standard:** SAK-EP (Standar Akuntansi Keuangan Entitas Privat).
  - Every financial transaction MUST create a Ledger Entry.
  - Use `AccountCode` enum for consistency.
- **Multi-Unit Support:** The system supports "Unit Usaha" (Savings/Loan, Retail, etc.).
  - Retail tables must link to `unit_usaha_id`.
- **Member vs Public:**
  - Retail module supports dual pricing (`price_sell_member` vs `price_sell_public`).
  - Savings payment method available only for Members.

## 4. Coding Conventions

- **Naming:** camelCase for variables/functions, PascalCase for components/classes, snake_case for Database columns.
- **Error Handling:** Services should throw errors; UI/Actions should catch and display user-friendly messages.
- **Type Safety:** No `any`. Define interfaces for all DB tables in `src/lib/types/` or service files.

## 5. Directory Structure

- `src/app`: Routes & Pages.
- `src/components`: UI Components (atomic).
- `src/lib/services`: Business Logic classes.
- `src/lib/actions`: Server Actions (form handlers).
- `src/lib/utils`: Helper functions.
