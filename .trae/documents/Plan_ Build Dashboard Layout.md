# Build Dashboard Layout & Sidebar (Phase 2)

## 🎯 Goal
Create the foundational UI structure for the Admin Dashboard. This includes a responsive Sidebar with navigation links (based on roles) and a Header.

## 📋 Context & Rules
- **Phase**: 2 (Admin Dashboard)
- **Tech Stack**: Next.js App Router, Tailwind CSS, Lucide Icons, Shadcn UI (if available, or standard Tailwind).
- **Structure**:
    - `src/app/dashboard/layout.tsx`: Main layout wrapper.
    - `src/components/dashboard/sidebar.tsx`: Navigation menu.
    - `src/components/dashboard/header.tsx`: User profile & mobile toggle.
- **Navigation Items**:
    - **Dashboard** (Home)
    - **Anggota** (Members)
    - **Simpanan** (Savings)
    - **Pinjaman** (Loans)
    - **Akuntansi** (Accounting)
    - **Pengaturan** (Settings)

## 🛠️ Implementation Plan

### 1. Setup Shadcn UI (Optional but recommended)
- Check if installed. If not, use standard Tailwind components for speed.
- *Decision*: Will use standard Tailwind + Lucide Icons for simplicity and speed unless user explicitly requested Shadcn setup (which takes more prompts).

### 2. Create Components
- `src/components/layout/Sidebar.tsx`:
    - Responsive (hidden on mobile, drawer style).
    - Links mapping to `/dashboard/*`.
    - Active state styling.
- `src/components/layout/Header.tsx`:
    - Breadcrumbs (optional).
    - User Dropdown (Logout).
    - Mobile Menu Trigger.

### 3. Create Dashboard Layout (`src/app/dashboard/layout.tsx`)
- Sidebar on left (fixed).
- Header on top.
- Main content area.

### 4. Create Dashboard Page (`src/app/dashboard/page.tsx`)
- Simple "Welcome" stats placeholders (Member Count, Total Assets).

### 5. Update Todo
- Mark "Build Dashboard Layout" as Completed.
