# Member RLS Security Issue

## Status
🔴 **CRITICAL** - Security vulnerability identified

## Problem

Current RLS policy for `member` table INSERT operation is too permissive:

```sql
CREATE POLICY "Enable insert for all authenticated users" ON public.member
  FOR INSERT TO authenticated
  WITH CHECK ( true );  -- ⚠️ Allows any authenticated user to insert with ANY user_id
```

### Security Impact

**HIGH RISK**: Any authenticated user can:
- Insert member records with `user_id` of other users
- Create fake member profiles
- Bypass intended security model

### Expected Behavior

Users should ONLY be able to insert member records where:
```sql
WITH CHECK ( auth.uid() = user_id )
```

## Root Cause

Migration `20251215123000_006_fix_schema_and_member_permissions.sql` created a permissive policy for debugging/testing purposes, but it was never replaced with a secure policy.

## Solution

### Option 1: Create New Migration (Recommended)

Create a new migration file that replaces the permissive policy:

```sql
-- Fix member INSERT policy to enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.member;

CREATE POLICY "member_insert_own_profile" ON public.member
  FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );
```

**Pros:**
- Maintains migration history
- Can be tested before applying
- Follows migration workflow

**Cons:**
- Requires new migration file
- Need to verify no breaking changes

### Option 2: Fix via Supabase Dashboard (Quick Fix)

Manually update the policy in Supabase Dashboard, then create migration to match.

**Pros:**
- Immediate fix
- Can test in production first

**Cons:**
- Manual step required
- Risk of drift between DB and migrations

## Testing Required

After fix is applied, verify:

1. ✅ User A can insert member with `user_id = A`
2. ❌ User A cannot insert member with `user_id = B`
3. ❌ User A cannot insert member without `user_id`
4. ❌ Unauthenticated users cannot insert

## Related Files

- Migration: `supabase/migrations/20251215123000_006_fix_schema_and_member_permissions.sql`
- Test: `supabase/migrations/tests/006_member_rls_security.sql`
- Current policy check: Run test file to see current state

## Action Items

- [ ] Create new migration to fix INSERT policy
- [ ] Update UPDATE policy if needed (currently correct)
- [ ] Run RLS security test to verify fix
- [ ] Update API layer to ensure `user_id = auth.uid()` is always set
- [ ] Add integration tests for security scenarios

## Notes

- Old migrations are FINAL and cannot be modified
- New migration is required to fix this issue
- This is a blocking issue for production deployment


