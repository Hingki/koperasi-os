# Koperasi OS - Accounting Compliance & Governance Document

**STATUS: CORE FREEZE ACTIVE**
**Last Updated:** 2025-12-29
**Governance Mode:** Strict Read-Only / SAK-EP Compliant

---

## 1. Compliance Checklist (SAK-EP)

### A. Financial Integrity (Ledger-First)

| Requirement | Status | Verification |
| :--- | :--- | :--- |
| **Source of Truth** | ✅ PASS | All reports (Neraca, LR, SHU) derived 100% from `ledger_entry` table. No stored report tables. |
| **Double Entry** | ✅ PASS | Enforced via `AccountingService`. Debits must equal Credits for every transaction. |
| **Immutability** | ✅ PASS | `ledger_entry` is append-only for standard users. Reversals require `void` action (audit trailed). |
| **Snapshot Usage** | ✅ PASS | Snapshots (`opening_balance_snapshot`) used ONLY as accelerators for Closed periods. Open periods always calculate full history. |

### B. Period Management

| Requirement | Status | Verification |
| :--- | :--- | :--- |
| **Period Status** | ✅ PASS | Implemented: OPEN, CLOSED, LOCKED. |
| **Closing Logic** | ✅ PASS | Draft entries block closing. Closing creates immutable opening balance snapshots. |
| **Reporting** | ✅ PASS | Reports respect period boundaries. Closed periods use snapshots for performance. |

### C. Multi-Unit & Consolidation

| Requirement | Status | Verification |
| :--- | :--- | :--- |
| **Unit Isolation** | ✅ PASS | `ReportService` supports `unitId` filtering for Retail/Simpan Pinjam specific reports. |
| **Consolidation** | ✅ PASS | Omitting `unitId` generates consolidated report for entire Koperasi. |

### D. Security & Audit

| Requirement | Status | Verification |
| :--- | :--- | :--- |
| **RLS Policies** | ✅ PASS | Row Level Security active on all accounting tables. Tenant isolation enforced. |
| **Audit Trail** | ✅ PASS | `created_by`, `posted_by`, `voided_by` columns tracked for all sensitive actions. |
| **Role Separation** | ✅ PASS | Admin/Bendahara required for Posting and Closing periods. |

---

## 2. Risk Notes & Operational Guidelines

### Critical Accounting Risks

1. **Migration Data Integrity**: The system assumes initial balances (Period 0) are correct. Any error in migration data requires a corrective journal entry; the database cannot be manually edited.
2. **Date vs Period Mismatch**: Reports rely on `book_date`. If a user posts a transaction with a `book_date` outside the active period, it may cause reporting anomalies. *Mitigation: Period validation on posting is active.*
3. **Voiding Logic**: Voiding a transaction creates a reversal entry. It does NOT delete the original entry. This is standard compliance but may confuse users expecting "deletion".

### Operational Procedures (SOP)

1. **Daily**: Input transactions as DRAFT.
2. **Weekly/Monthly**: Bendahara reviews Drafts -> POST.
3. **End of Month**:
    - Ensure all Drafts are resolved (Posted or Voided).
    - Verify Trial Balance (Neraca Lajur) is balanced.
    - Execute "Tutup Buku" (Close Period).
4. **Correction**: If error found after closing, use "Reopen Period" (Emergency Only) or post adjustment in current period.

---

## 3. Technical Architecture (Frozen Core)

### Core Services (DO NOT MODIFY)

- `AccountingService`: Journal posting, validation, voiding.
- `AccountingPeriodService`: Period management, closing, snapshotting.
- `ReportService`: Report generation, snapshot integration.

### Data Structures (DO NOT MODIFY)

- `ledger_entry`: Financial heart.
- `chart_of_accounts`: Standardized COA.
- `accounting_period`: Time boundaries.
- `opening_balance_snapshot`: Performance cache.

---

**AUTHORIZED BY:** System Architect
**DATE:** 2025-12-29
