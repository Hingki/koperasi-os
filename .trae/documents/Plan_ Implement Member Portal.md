# Implement Member Portal (Phase 2)

## 🎯 Goal
Create a dedicated, mobile-friendly portal for Members to view their financial status (Loans, Savings) and apply for new services.

## 📋 Context & Rules
- **Phase**: 2 (Member Portal)
- **Route Base**: `/portal` (Distinct from `/dashboard`).
- **Target Audience**: Regular members (mobile users).
- **Data Access**: Strictly limited to `auth.uid()` via RLS.

## 🛠️ Implementation Plan

### 1. Portal Layout (`src/app/portal/layout.tsx`)
- Simplified Navigation (Bottom Tab Bar for mobile, or simple Header).
- **Tabs**: Home, Loans, Savings, Profile.

### 2. Member Dashboard (`src/app/portal/page.tsx`)
- **Welcome**: "Hello, [Name]".
- **Cards**:
    - **Total Savings Balance**.
    - **Active Loan** (Next payment due).
- **Quick Actions**: "Apply Loan".

### 3. My Loans Page (`src/app/portal/loans/page.tsx`)
- List of user's loans.
- Details link to see repayment schedule.

### 4. My Savings Page (`src/app/portal/savings/page.tsx`)
- List of savings accounts.
- Recent transactions.

### 5. Update Todo
- Mark "Implement Member Portal Dashboard" as Completed.
