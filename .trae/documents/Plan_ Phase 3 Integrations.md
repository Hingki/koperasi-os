# Phase 3: Integrations & Reporting

## 🎯 Goal
Implement external integrations (WhatsApp) and document generation (PDF) to professionalize the system.

## 📋 Context & Rules
- **Phase**: 3
- **Integrations**:
    - **WhatsApp**: Use a simple abstraction (mock for now, or placeholder for Twilio/Waboxapp).
    - **PDF**: Use `react-pdf` or `jspdf` for generating contracts.
- **Reporting**:
    - **Balance Sheet**: Aggregated view of Ledger Accounts.

## 🛠️ Implementation Plan

### 1. WhatsApp Notification Service (`src/lib/services/notification.ts`)
- **Goal**: Abstract notification logic.
- **Method**: `sendNotification(to, template, params)`.
- **Implementation**:
    - Create a service class.
    - Implement a `sendWhatsApp` method.
    - **Mock**: For now, just `console.log` heavily so we can see it in server logs. Real API integration requires keys we don't have.
- **Hook Points**:
    - Add to `LoanWorkflowService` (on Approval).
    - Add to `LoanService` (on Disbursement).

### 2. PDF Generator (`src/lib/services/pdf-service.ts`)
- **Goal**: Generate "Loan Agreement" (Perjanjian Kredit).
- **Tool**: `jspdf` (client-side) or `pdf-lib` (server-side). Let's use `pdf-lib` for server-side generation if we want to email it, or client-side for immediate download.
- **Decision**: Client-side download is easier for MVP.
- **UI**: Add "Download Contract" button on Loan Detail page.

### 3. Financial Reporting (`src/app/dashboard/accounting/page.tsx`)
- **Goal**: Real-time Balance Sheet.
- **Query**: Aggregate `ledger_entry` by `account_code`.
- **UI**: Table showing Assets vs Liabilities/Equity.

### 4. Update Todo
- Mark respective tasks as Completed.
