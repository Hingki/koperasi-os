## [Unreleased]
- hotfix: force requiresAdmin to false for presentation stability

## [Unreleased]
- hotfix: bypass admin check for sidebar and disable crashy button for presentation

## [Unreleased]
- chore: add version indicator to verify deployment

## [Unreleased]
- fix: resolve typescript errors and push dashboard admin button fixes

## [Unreleased]
- refactor: consolidate middleware to src/middleware.ts and remove duplicate

## [Unreleased]
- fix: resolve build error by aligning server action signature

## [Unreleased]
- chore: force show claim admin button for debugging

## [Unreleased]
- fix: revert role checking to user_role only

## [Unreleased]
- fix: update role checking to use members table for admin access

## [Unreleased]
- docs: cleanup changelog

## [Unreleased]
- fix: safe env var check in middleware to prevent build crash
- fix: use safe fallback for missing env vars to prevent build crash
- fix: sanitize env vars to strip quotes and whitespace
- fix: explicit env var checks in supabase clients and fix a11y issue
- fix: handle missing env vars in middleware and remove duplicate config
- fix: resolve next.js 16 build errors and prepare for deployment
- Merge remote-tracking branch 'origin/main'

# Changelog

Semua perubahan penting pada proyek **Koperasi-OS** akan didokumentasikan di sini.
Format mengikuti Keep a Changelog dan Semantic Versioning.

## [Unreleased]

### Added
- **Accounting Reports Suite**:
  - **SHU Report**: Automated Sisa Hasil Usaha calculation with allocation simulation.
  - **Unit Balance Sheet**: Balance sheet filtered by business unit (USP vs Waserda).
  - **Daily Report**: Transaction daily recap with date filtering and Excel export.
  - **Billing Recap**: Monthly loan billing monitoring with payment status.
  - **RAT Archive**: Digital repository for Annual Members Meeting documents.
- **Member Portal Enhancements**:
  - **Editable Profile**: Members can now update their phone number, email, and address.
  - **Notifications**: Real-time notification system with read status tracking.
  - **Header Bar**: New top navigation bar in member area with notification bell.
  - **Savings**: Updated member savings page columns and data source.
- **Member Portal (`/member`)**:
  - **Role-Based Access**: Dedicated login flow and routing for members vs admins.
  - **Dashboard**: Personal summary of savings, loans, and upcoming installments.
  - **Savings**: View account balances and transaction history.
  - **Loans**: 
    - List of active and past loans.
    - Detailed view with repayment schedule and progress bar.
    - Online Loan Application form with server-side validation.
  - **Profile**: Read-only view of member details.
- **Full Dashboard Implementation**:
  - **Retail Module**: Suppliers, Products, Purchases, POS (Point of Sale).
  - **Loans Module**: Loan application, approval workflow, active loan management.
  - **Accounting Module**: Balance Sheet, Income Statement, Cash Flow (with Tailwind styling).
  - **Settings Module**: Koperasi profile management with auto-linking to user metadata.
- **System Stability & Validation**:
  - Implemented consistent UUID validation (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) across all pages.
  - Added `koperasi_id` filtering to all database queries to ensure data isolation and performance.
  - Enhanced server actions with robust error handling and type safety.
  - Added `getIndentClass` helper to replace inline styles in reports.

### Fixed
- **Critical Bugs**:
  - Resolved "22P02" invalid input syntax for UUID errors on loan and settings pages.
  - Fixed `net::ERR_ABORTED` errors on `/dashboard/settings` and `/dashboard/members` due to slow rendering/unfiltered queries.
  - Fixed "ERR_EMPTY_RESPONSE" server crashes by implementing defensive coding patterns.
- **Improvements**:
  - Fixed TypeScript errors in form actions (`reviewLoanApplicationAction`).
  - Resolved "CSS inline styles should not be used" warnings.
  - Optimized database queries to reduce server strain.

## [v6.1.0] - 2025-12-20




















