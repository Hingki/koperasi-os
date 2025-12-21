I have analyzed the current system and found that while we have the database table (`koperasi`), there is currently no user interface to manage this "Core Data" (Cooperative Name, Legal Number, Address, etc.).

I propose the following plan to implement the **Core Koperasi Data Management** and then the **Dashboard**, ensuring the system is correctly initialized as you requested.

### Phase 1: Core Koperasi Data (The Foundation)
1.  **Create Service**: Implement `src/lib/services/koperasi-service.ts` to fetch and update the cooperative's profile.
2.  **Update Settings Page**: Transform `src/app/dashboard/settings/page.tsx` into a comprehensive management page that allows you to input:
    *   **Identity**: Name (Koperasi Merah Putih...), Legal Number (Badan Hukum).
    *   **Contact**: Address, Phone, Email.
    *   **Configuration**: Initial setup parameters.
3.  **Server Action**: Implement the logic to securely save these changes to the database.

### Phase 2: Dashboard Implementation (The Visuals)
Once the core data is ready, I will build the Dashboard (`src/app/dashboard/page.tsx`) using the "Modern Standard" layout (referenced from your screenshots requirement):
1.  **Summary Cards** (Top Row):
    *   **Total Members**: Active count.
    *   **Total Assets**: Calculated from the Ledger.
    *   **Active Loans**: Outstanding principal.
    *   **Total Savings**: Total member deposits.
2.  **Charts & Activity** (Middle/Bottom):
    *   **Financial Overview**: Debit/Credit volume over time.
    *   **Recent Activity**: List of latest member registrations or transactions.

### Phase 3: Verification
1.  We will navigate to **Settings** and fill in the "Koperasi Kelurahan Merah Putih Duri Kosambi" details.
2.  We will verify that these details appear correctly on the Dashboard and in generated documents (like contracts).

Shall I proceed with **Phase 1 (Core Data)** immediately?