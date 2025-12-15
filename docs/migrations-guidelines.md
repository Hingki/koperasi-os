# Migration Guidelines

This document contains conventions and checks we run for SQL migrations.

- Place active migrations in `supabase/migrations/`.
- Move debug or temporary migrations to `supabase/migrations/archived/` and mark them `ARCHIVED and disabled`.
- Make migrations idempotent when possible:
  - Create enums with `IF NOT EXISTS` (or wrap in a `DO $$ BEGIN IF NOT EXISTS ... END$$;`).
  - Prefer `CREATE TABLE IF NOT EXISTS` to avoid failures on re-run.
- Add tests for any RLS or permission changes under `supabase/migrations/tests/`.
- Use the `npm run lint:migrations` script locally or CI to validate migrations before opening PRs.

If you need help updating a migration to be idempotent, ask for a review and I can suggest a minimal change.
