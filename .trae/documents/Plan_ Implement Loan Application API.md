# Implement Loan Application API (Phase 1B)

## 🎯 Goal
Create the secure API endpoint for members to submit loan applications (`POST /api/loans/apply`), enforcing business rules defined in `arsitektur-final.md`.

## 📋 Context & Rules
- **Phase**: 1B (Loan Module)
- **Architecture**: Next.js App Router (API Routes) + Supabase RLS.
- **Pattern**: Follow `src/app/api/members/register/route.ts` pattern (Zod validation -> Supabase Insert).
- **Business Rules** (from Architecture):
  - Valid Member only.
  - Valid Loan Product (active).
  - Amount within Product's min/max limits.
  - Initial status: `draft` or `submitted`.

## 🛠️ Implementation Plan

### 1. Validation Schema (`src/lib/validations/loan.ts`)
Define Zod schema for the loan application payload:
- `productId`: UUID
- `amount`: Number (min/max checks)
- `tenorMonths`: Integer
- `purpose`: String (optional/required based on product)

### 2. API Endpoint (`src/app/api/loans/apply/route.ts`)
Implement `POST` handler:
- **Auth**: Verify user is authenticated (`supabase.auth.getUser()`).
- **Member Check**: Ensure user is a valid member.
- **Validation**: Parse body with Zod schema.
- **Product Check**: Fetch `loan_products` to verify limits (min/max amount, max tenor).
- **Insert**: Create record in `loan_applications`.
- **Response**: Return the created application ID.

### 3. Update Todo
- Mark "Loan application form/API" as In Progress/Done.

## ⚠️ Note on "Missing Files"
The user referenced `@src/services/LedgerService.js` and `@src/controllers/SimpananController.js`, but these do not exist in the current project structure. I will stick to the existing **Next.js App Router pattern** (`src/app/api/...`) which is currently used for Member Registration.
