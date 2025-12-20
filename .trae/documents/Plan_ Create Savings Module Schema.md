# Database Schema Design: Savings Module (Phase 1A)

## 🎯 Goal
Create the schema to store **Savings Products** (Simpanan) and **Member Accounts**. This module manages member deposits, including Principal (Pokok), Mandatory (Wajib), and Voluntary (Sukarela) savings.

## 📋 Context & Rules
- **Phase**: 1A (Savings Module)
- **Architecture**: Ledger-First.
- **Concepts**:
  - `savings_products`: Defines the type (e.g., Simpanan Pokok, Sukarela).
  - `savings_accounts`: The actual account belonging to a member.
  - `transactions`: Handled via `ledger_entry` (Source of Truth) but we might need a `savings_transactions` table for easier querying/UI display (read model).

## 🛠️ Implementation Plan

### 1. ENUMs
- `savings_type`: `pokok`, `wajib`, `sukarela`, `berjangka`.
- `savings_status`: `active`, `dormant`, `closed`.

### 2. Table: `savings_products`
Defines the rules for each savings type.
- `id`: UUID
- `code`: String (e.g., 'SP-001')
- `name`: String
- `type`: `savings_type`
- `interest_rate`: Numeric (Annual %)
- `min_balance`: Numeric
- `is_withdrawal_allowed`: Boolean (Pokok/Wajib usually False until exit)

### 3. Table: `savings_accounts`
Holds the current balance for a member.
- `id`: UUID
- `member_id`: FK to `member`
- `product_id`: FK to `savings_products`
- `account_number`: String (Unique)
- `balance`: Numeric (Current running balance)
- `status`: `savings_status`
- `last_transaction_at`: Timestamptz

### 4. Table: `savings_transactions` (Optional Read Model)
*Decision*: To strictly follow Ledger-First, we *could* derive balance from ledger. However, for performance, we usually keep a `savings_transactions` table as a "Materialized View" or just a transaction log that is updated *alongside* the ledger.
*Plan*: Create `savings_transactions` for fast history lookup.
- `id`: UUID
- `account_id`: FK
- `amount`: Numeric (+/-)
- `type`: `deposit`, `withdrawal`, `interest`, `admin_fee`
- `ledger_entry_id`: FK to `ledger_entry` (Link to accounting)

### 5. Migration File
Create `supabase/migrations/20251220160000_create_savings_module.sql`.
