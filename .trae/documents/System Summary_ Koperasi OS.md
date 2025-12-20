Here is the comprehensive plan to complete the remaining 40% of Koperasi OS, focused on "Ledger-First" architecture and high-priority deliverables.

## 📅 Roadmap Overview (Estimated: 5-6 Weeks)

### 🧱 Phase 1: Core Financial Engine (Backend Focus)
**Goal:** Implement the heart of the system—Loans, Savings, and Ledger integration.
**Estimated Time:** 2 Weeks
**Primary Agent Role:** Backend & Database Architect

1.  **Ledger Integration Layer**
    *   Create abstraction/helper for "Double Entry Recording" (ensure every transaction writes to `ledger_entry`).
    *   Implement `idempotency` util for financial transactions.
2.  **Savings Module (Simpanan)**
    *   API: Product Config (Pokok, Wajib, Sukarela).
    *   API: Deposit & Withdrawal (Trigger Ledger Entry).
    *   Business Logic: Interest Calculation job.
3.  **Loan Module (Pinjaman)**
    *   API: Loan Products & Calculator.
    *   API: Loan Application (submission).
    *   **Workflow Engine**: Approval State Machine (Pending -> Survey -> Committee -> Approved/Rejected).
    *   API: Disbursement (Trigger Ledger Entry).
    *   API: Installment Payment (Principal + Interest split).

### 🖥️ Phase 2: Admin Dashboard & Operations (Frontend Focus)
**Goal:** Visualize data and enable operational workflows.
**Estimated Time:** 2 Weeks
**Primary Agent Role:** Full-Stack/Frontend Specialist

1.  **Dashboard Shell & Components**
    *   Implement layout with Sidebar (RBAC filtered).
    *   Reusable Components: DataTables (Server-side sorting/filtering), Status Badges, Action Modals.
2.  **Operational Pages**
    *   **Member Management**: List, Detail, Verify Documents.
    *   **Loan Approval Center**: Interface for Credit Committee to review and approve/reject.
    *   **Teller Interface**: Simple UI for handling cash deposits/withdrawals.
3.  **Member Portal**
    *   Dashboard: Total Savings, Active Loans.
    *   History: Transaction logs.

### 🔌 Phase 3: Integrations & Reporting
**Goal:** External connectivity and compliance documents.
**Estimated Time:** 1 Week
**Primary Agent Role:** Integration Specialist

1.  **Notification Service**
    *   Setup `pg_notify` listener for system events.
    *   Integrate WhatsApp Gateway (e.g., Twilio/Wablas) for "Payment Received" or "Loan Approved".
2.  **Document Engine**
    *   PDF Generation: Registration Form, Loan Agreement (SPK), Payment Receipt.
3.  **Financial Reporting**
    *   Generate Balance Sheet & Income Statement from `ledger_entry`.
    *   Export to Excel/PDF.

### 🛡️ Phase 4: Reliability & Deployment
**Goal:** Production readiness.
**Estimated Time:** 1 Week
**Primary Agent Role:** QA & DevOps

1.  **Testing**
    *   **E2E Tests**: Critical paths (Register -> Save -> Loan -> Repay).
    *   **Load Test**: Simulate concurrent ledger writes.
2.  **Deployment**
    *   Finalize CI/CD (GitHub Actions).
    *   Database Migration strategy (Production).
    *   Security Audit (RLS check, API limits).

## 🛠️ Execution Strategy: Custom Agents
I will adapt my persona for each task to ensure specialized attention:

*   **For Phase 1 (Backend)**: I will act as a **Strict DBA**. I will verify every SQL query for performance and RLS compliance. I will refuse to write code that violates "Ledger-First".
*   **For Phase 2 (Frontend)**: I will act as a **UX Developer**. I will focus on responsiveness, error states, and loading skeletons.
*   **For Phase 3 (Integrations)**: I will act as a **Systems Integrator**, focusing on error handling and retries for external APIs.

## 🚀 Immediate Next Step
We should start **Phase 1: Loan Module**. Specifically, defining the **Loan Product Schema** and **Application Flow**.

Shall we begin with creating the `loan_products` and `loan_applications` tables?