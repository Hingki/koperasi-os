# User Preferences & Rules

## 1. Language & Localization

- **Primary Language:** Bahasa Indonesia.
- All UI text (buttons, labels, messages) MUST be in formal/standard Indonesian.
- Code comments and variable names can remain in English for technical clarity.

## 2. Design Philosophy

- **"Super App" Feel:** The interface should feel like a modern mobile super app (e.g., Gojek/Grab style dashboard).
- **Responsive:** Mobile-first priority. Many users will access via phone.
- **Reference Models:**
  - **Kopdesa.com:** Reference for features (POS, PPOB, Sembako).
  - **SmartCoop.id:** Reference for loan workflow and cooperative standards.

## 3. Specific Feature Requirements

- **POS (Kasir):**
  - Must support "Bayar Pakai Saldo Simpanan".
  - Auto-detect Member vs Non-Member price.
- **Loans:**
  - "Interest First" (Bunga Menurun/Flat) calculation logic preferred unless specified otherwise.
  - Strict approval workflow (Draft -> Submitted -> Approved -> Disbursed).

## 4. Development Workflow

- **Bias for Action:** Implement best-practice solutions proactively.
- **Validation:** Always verify builds (`npm run build`) before finishing a task.
- **Database:** Use Migrations for all schema changes.
