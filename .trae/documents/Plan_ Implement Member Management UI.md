# Implement Member Management Pages (Phase 2)

## 🎯 Goal
Create the UI for managing Members. This allows Admins to view the member directory, register new members, and view individual member profiles (including their financial summary).

## 📋 Context & Rules
- **Phase**: 2 (Admin Dashboard)
- **Routes**:
    - `/dashboard/members`: List View.
    - `/dashboard/members/new`: Create View.
    - `/dashboard/members/[id]`: Detail View.
- **Data Access**: Use Server Components for fetching. Use Server Actions for mutations (simplifies form handling in Next.js App Router).

## 🛠️ Implementation Plan

### 1. Member List Page (`src/app/dashboard/members/page.tsx`)
- **Fetch**: `SELECT * FROM member ORDER BY created_at DESC`.
- **UI**: Table showing Name, NIK, Phone, Status, Joined Date.
- **Action**: "Add Member" button linking to `/new`.

### 2. Member Registration Page (`src/app/dashboard/members/new/page.tsx`)
- **Form**:
    - Full Name (nama_lengkap)
    - NIK
    - Phone
    - Address
    - Mother's Name (nama_ibu_kandung)
    - Birth Place/Date
- **Action**: `createMember` Server Action.

### 3. Server Actions (`src/lib/actions/member.ts`)
- `createMember(formData)`:
    - Validate inputs (Zod).
    - Insert into `member` table.
    - Revalidate path.
    - Redirect to list.

### 4. Member Detail Page (`src/app/dashboard/members/[id]/page.tsx`)
- **Fetch**: Member details + Loans + Savings Accounts.
- **UI**:
    - Profile Card (Left).
    - Tabs (Right): "Active Loans", "Savings", "History".

### 5. Update Todo
- Mark "Implement Member Management Pages" as Completed.
