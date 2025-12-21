# Fix 404 Error: Create Login Page

## 🔍 Diagnosis
The user reported a 404 on `/login`.
Checking the file structure in `src/app`, I see:
- `src/app/register/page.tsx` (Exists)
- `src/app/page.tsx` (Landing Page)
- `src/app/dashboard` (Protected Area)
- **MISSING**: `src/app/login/page.tsx`

We missed creating the dedicated Login page!

## 🛠️ Fix Plan
1.  **Create Login Page**: `src/app/login/page.tsx`.
2.  **Logic**:
    - Use Supabase Auth (`signInWithPassword`).
    - Redirect to `/dashboard` on success (or `/portal` depending on role, but `/dashboard` is safe for now).
    - Add a link to `/register`.
3.  **Create Login Form Component**: To keep it clean.

## 🚀 Execution
I will immediately create the `src/app/login/page.tsx` with a standard email/password form.
