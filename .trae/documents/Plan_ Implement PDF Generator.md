# Implement PDF Document Generator (Phase 3)

## 🎯 Goal
Allow admins to generate and download a PDF "Loan Agreement" (Surat Perjanjian Kredit) for approved loan applications.

## 📋 Context & Rules
- **Phase**: 3 (Reporting)
- **Tech Stack**: `jspdf` (Client-side generation).
- **Why Client-Side?**: simpler deployment (no serverless function timeout limits for PDF generation), immediate feedback, lower server load.
- **Document Content**:
    - Header (Koperasi Name).
    - Member Details (Name, NIK, Address).
    - Loan Details (Amount, Tenor, Installment).
    - Terms & Conditions (Static text).
    - Signature Placeholders.

## 🛠️ Implementation Plan

### 1. Install Dependencies
- `jspdf`
- `jspdf-autotable` (optional, but good for schedules).

### 2. PDF Generator Utility (`src/lib/utils/pdf-generator.ts`)
- `generateLoanContract(application, member, product)`:
    - Creates new jsPDF instance.
    - Adds text, lines, and formatting.
    - Returns the blob/save.

### 3. Integrate with UI (`src/app/dashboard/loans/approvals/[id]/page.tsx`)
- Add "Download Contract" button.
- On click -> trigger client-side generation.
- Note: Since `page.tsx` is a Server Component, we need a Client Component wrapper for the button or move the generation logic to a Client Component.
- *Decision*: Create `DownloadContractButton` component.

### 4. Update Todo
- Mark "Implement PDF Document Generator" as Completed.
