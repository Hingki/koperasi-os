# ✅ TODO List Koperasi OS

## 🚀 Phase 1: Foundation Setup (MVP)

### 1.1 Project Initialization

- [✅] Initialize Git repository with proper branching strategy
- [✅] Setup Supabase project
- [✅] Configure Next.js 14 with TypeScript
- [✅] Setup ESLint, Prettier, and Husky for code quality
- [✅] Configure environment variables
- [ ] Setup CI/CD pipeline (GitHub Actions)
- [✅] Setup CI/CD pipeline (GitHub Actions) (basic: lint/build/test, migrations preview, optional Vercel deploy)

### 1.2 Database Foundation

- [✅] Implement core tables (koperasi, member, user_role)
- [ ] Setup accounting periods
- [ ] Create chart of accounts structure
- [ ] Implement ledger entry table with partitioning
- [✅] Setup accounting periods
- [✅] Create chart of accounts structure
- [✅] Implement ledger entry table with partitioning
- [✅] Create initial database migration
- [🔧] Setup RLS policies for all tables (in-progress: conservative RBAC migration + smoke tests added)
- [ ] Create audit logging triggers
- [✅] Create audit logging triggers
- [✅] Member RLS policies implemented (insert/update)
- [✅] Fix Member INSERT RLS policy security issue (migration 015 - enforce user_id = auth.uid())
- [✅] Grants for `public` schema and `member` table applied
- [✅] Make enum definitions idempotent and normalized (`member_type`, `member_status`, `user_role_type`)
- [✅] Add `updated_at` triggers for `koperasi`, `member`, and `user_role`
- [✅] Test migration validated `member` insert (temporary migration archived)
  - [✅] Add CI check to verify archived migrations are disabled
  - [✅] Add preview DB migration CI job to run migrations against disposable Postgres (applies only non-archived migrations)

### 1.3 Authentication & Authorization

- [✅] Implement Supabase Auth integration
- [✅] Create user registration/login flow
- [✅] Implement role-based access control (helper functions, RLS policies, API endpoints, middleware)
- [✅] Setup session management (via Supabase Auth + middleware)
- [✅] Create middleware for route protection (role-based route protection implemented)

## 🏗️ Phase 2: Core Modules (MVP)

### 2.1 Member Management

- [✅] Member registration form (refactored to use API endpoint with Zod validation)
- [ ] Member profile management
- [ ] Member list with search/filter
- [ ] Member status management (active, suspended, etc.)
- [ ] Member document upload

### 2.2 Savings Management

- [ ] Savings product configuration
- [ ] Account opening process
- [ ] Deposit/withdrawal transactions
- [ ] Savings balance calculation
- [ ] Interest calculation (based on AD/ART rules)

### 2.3 Loan Management

- [ ] Loan product configuration
- [ ] Loan application form
- [ ] Loan approval workflow
- [ ] Disbursement process
- [ ] Installment calculation
- [ ] Payment processing

### 2.4 Ledger & Accounting

- [ ] Transaction recording to ledger
- [ ] Double-entry implementation
- [ ] Trial balance generation
- [ ] Financial statements (Balance Sheet, Income Statement)
- [ ] Period closing process

## 🔐 Phase 3: Security & Compliance

### 3.1 Security Implementation

- [ ] Implement idempotency for all financial transactions
- [ ] Add request validation for all APIs
- [ ] Implement rate limiting
- [ ] Setup security headers
- [ ] Conduct security audit

### 3.2 Compliance Features

- [ ] SAK-EP compliant reports
- [ ] Audit trail implementation
- [ ] Data retention policies
- [ ] Backup and recovery procedures
- [ ] Generate compliance reports

## 📊 Phase 4: Reporting & Analytics

### 4.1 Dashboard

- [ ] Executive dashboard with KPIs
- [ ] Member statistics
- [ ] Savings overview
- [ ] Loan portfolio analysis
- [ ] Cash flow visualization

### 4.2 Reports

- [ ] Member reports
- [ ] Savings reports
- [ ] Loan reports
- [ ] Financial statements
- [ ] Custom report builder

## 🚀 Phase 5: Advanced Features

### 5.1 Business Modules

- [ ] Sembako management
- [ ] LPG distribution
- [ ] Other business units (based on AD/ART)

### 5.2 Integrations

- [ ] WhatsApp notifications
- [ ] Email notifications
- [ ] Bank API integration
- [ ] Payment gateway (QRIS)

### 5.3 Mobile App

- [ ] React Native app structure
- [ ] Member mobile features
- [ ] Offline capabilities
- [ ] Push notifications

## 🔧 Phase 6: Performance & Optimization

### 6.1 Database Optimization

- [ ] Query optimization
- [ ] Index tuning
- [ ] Partitioning implementation
- [ ] Caching strategy

### 6.2 Application Optimization

- [ ] Code splitting
- [ ] Image optimization
- [ ] Bundle size reduction
- [ ] Performance monitoring

## 🧪 Phase 7: Testing & QA

### 7.1 Testing Implementation

- [ ] Unit tests for all business logic
- [🔧] Integration tests for APIs (in-progress: Playwright scaffold added)
- [✅] E2E tests for critical flows (registration, login, ledger flows added)
- [ ] Performance testing
- [ ] Security testing

## Notes & Actions Taken (mapped to `arsitektur-final.md`)

- Normalized enums and made their creation idempotent in the initial migration (`20251214112545_001_create_core_tables.sql`).
- Implemented `member` RLS policies and repaired remote migration history for debug entries.
- Archived debug migrations and added marker files in `/supabase/migrations/archived` to prevent accidental execution.
- Added `updated_at` trigger function and attached triggers to `koperasi`, `member`, and `user_role`.
- Executed a temporary test migration to validate `member` insert under current RLS/grants; test was removed and archived.
- **SECURITY FIX (2025-12-16)**: Fixed critical RLS security vulnerability in member INSERT policy. Migration `20251216120000_015_fix_member_insert_rls_policy.sql` enforces `user_id = auth.uid()` constraint. Previous policy allowed any authenticated user to insert with any user_id. See `docs/security/member-rls-security-issue.md` for details.
- **MEMBER REGISTRATION (2025-12-16)**: Implemented production-ready member registration feature:
  - ✅ Zod validation schema with Indonesian data format validation (NIK, phone)
  - ✅ Secure API endpoint `/api/members/register` with RLS compliance
  - ✅ Refactored frontend form with client-side validation and error handling
  - ✅ Integration tests (Playwright) for end-to-end flow and RLS verification
- **RBAC IMPLEMENTATION (2025-12-16)**: Implemented complete Role-Based Access Control system:
  - ✅ Helper functions for role checking (getUserRoles, hasRole, hasAnyRole, etc.)
  - ✅ RLS policies for user_role table (users see own, admins manage all)
  - ✅ API endpoints: GET /api/auth/roles, POST /api/admin/roles/assign
  - ✅ Next.js middleware for route protection based on roles
  - ✅ Member approval API with auto-assign role 'anggota'
  - ✅ E2E tests for RBAC verification
- Next: create PR for these changes and add CI rule to ignore `/supabase/migrations/archived` (PR open step in progress).

### 7.2 Quality Assurance

- [ ] Code review process
- [ ] Documentation
- [ ] User acceptance testing
- [ ] Bug tracking and resolution

## 🚀 Phase 8: Deployment & Operations

### 8.1 Deployment

- [ ] Staging environment setup
- [ ] Production deployment
- [ ] Database migration strategy
- [ ] Rollback procedures

### 8.2 Monitoring & Maintenance

- [ ] Application monitoring setup
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Backup verification
- [ ] Disaster recovery testing

## 📚 Documentation

- [ ] API documentation
- [ ] User manual
- [ ] Admin guide
- [ ] Technical documentation
- [ ] Deployment guide
