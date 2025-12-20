# Implement Loan Approval Workflow (Phase 1B)

## 🎯 Goal
Implement the workflow state machine for loan applications (`draft` -> `submitted` -> `approved`/`rejected`), enforcing role-based permissions defined in `arsitektur-final.md`.

## 📋 Context & Rules
- **Phase**: 1B (Loan Module)
- **Architecture**: Next.js App Router (API Routes) + Supabase RLS.
- **Roles**:
  - `member`: Can only `submit` their own `draft` applications.
  - `admin`, `pengurus`, `ketua`: Can `approve` or `reject` submitted applications.
- **Workflow State Machine**:
  1.  `draft` (Created by Member)
  2.  `submitted` (Action by Member)
  3.  `approved` / `rejected` (Action by Admin)

## 🛠️ Implementation Plan

### 1. Validation Schema (`src/lib/validations/loan.ts`)
Add schema for workflow actions:
- `loanId`: UUID
- `action`: Enum (`submit`, `approve`, `reject`)
- `notes`: String (optional for submit/approve, required for reject)

### 2. API Endpoint (`src/app/api/loans/[id]/workflow/route.ts`)
Implement `POST` handler to transition states:
- **Auth**: Verify user is authenticated.
- **Fetch Application**: Get current status.
- **State Machine Logic**:
  - **Submit**: `draft` -> `submitted`. (User must be owner).
  - **Approve**: `submitted` -> `approved`. (User must be Admin/Pengurus).
  - **Reject**: `submitted` -> `rejected`. (User must be Admin/Pengurus).
- **Update**: Perform update on `loan_applications` with `workflow_metadata` (who approved/rejected, timestamp).
- **Response**: Return updated application.

### 3. Update Todo
- Mark "Loan approval workflow" as In Progress/Done.
