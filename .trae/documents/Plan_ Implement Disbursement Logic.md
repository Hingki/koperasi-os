# Implement Disbursement Logic (Phase 1B)

## 🎯 Goal
Implement the logic to disburse a loan. This is a complex transaction that transitions an `approved` application into an `active` loan, generates the repayment schedule, and (eventually) records the financial transaction in the ledger.

## 📋 Context & Rules
- **Phase**: 1B (Loan Module)
- **Input**: `application_id` (must be `approved`).
- **Output**: 
    - `loan_applications` -> `disbursed`.
    - New `loans` record created.
    - New `loan_repayment_schedule` records created.
- **Financial Calculation**:
    - **Flat Interest**: `Total Interest = Principal * Rate * (Tenor/12)`.
    - **Installment**: `(Principal + Total Interest) / Tenor`.
- **Ledger**: (Stubbed for now, but placeholder included).

## 🛠️ Implementation Plan

### 1. Validation Schema (`src/lib/validations/loan.ts`)
Add `loanDisbursementSchema` (optional, mainly just needs `applicationId` and `disbursedAt`).

### 2. Service Logic (`src/lib/services/loan-service.ts`)
Create a dedicated service file for heavy logic (instead of putting it all in the route handler):
- `calculateSchedule(principal, rate, tenor, type)`: Returns array of installments.
- `disburseLoan(applicationId, userId)`:
    1.  Fetch Application & Product.
    2.  Validate status is `approved`.
    3.  Calculate financials (Interest, Installment).
    4.  **Transaction**:
        -   Update Application status.
        -   Insert into `loans`.
        -   Insert into `loan_repayment_schedule`.

### 3. API Endpoint (`src/app/api/loans/[id]/disburse/route.ts`)
- **Auth**: Admin/Pengurus/Bendahara only.
- **Call Service**: Invoke `disburseLoan`.
- **Response**: Return the created Loan ID.

### 4. Update Todo
- Mark "Implement Disbursement Logic" as In Progress/Done.
