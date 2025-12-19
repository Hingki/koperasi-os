# RBAC (Role-Based Access Control) Implementation

## Overview

Role-Based Access Control (RBAC) system untuk Koperasi OS menggunakan Supabase Auth dan Row Level Security (RLS) untuk mengatur akses berdasarkan role pengguna.

## Architecture

```
User → Supabase Auth → Middleware → Route Handler → RBAC Helper → Database (RLS)
```

## Role Hierarchy

Roles diurutkan berdasarkan tingkat privilege (higher number = more privileges):

1. **admin** (100) - Full access, can manage all roles
2. **ketua** (90) - Leadership role
3. **pengurus** (80) - Management role
4. **bendahara** (75) - Financial management
5. **staff** (50) - Staff role
6. **anggota** (10) - Regular member

## Database Schema

### user_role Table

```sql
CREATE TABLE user_role (
  id UUID PRIMARY KEY,
  koperasi_id UUID NOT NULL,
  user_id UUID NOT NULL,
  member_id UUID REFERENCES member(id),
  role user_role_type NOT NULL,
  permissions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
```

### RLS Policies

1. **user_role_select_own**: Users can see their own roles
2. **user_role_select_admin**: Admins can see all roles in their koperasi
3. **user_role_insert_admin**: Only admins can insert roles
4. **user_role_update_admin**: Only admins can update roles
5. **user_role_delete_admin**: Only admins can delete roles

## Helper Functions

### Location: `src/lib/auth/roles.ts`

#### `getUserRoles(koperasiId?: string)`
Get all active roles for the current authenticated user.

```typescript
const roles = await getUserRoles();
// Returns: UserRole[]
```

#### `hasRole(role: UserRoleType, koperasiId?: string)`
Check if user has a specific role.

```typescript
const isAdmin = await hasRole('admin', koperasiId);
```

#### `hasAnyRole(roles: UserRoleType[], koperasiId?: string)`
Check if user has any of the specified roles.

```typescript
const isPengurus = await hasAnyRole(['admin', 'ketua', 'pengurus'], koperasiId);
```

#### `hasAllRoles(roles: UserRoleType[], koperasiId?: string)`
Check if user has all of the specified roles.

#### `isAdmin(koperasiId?: string)`
Convenience function to check admin role.

#### `isPengurus(koperasiId?: string)`
Convenience function to check pengurus level (pengurus, ketua, or admin).

#### `isBendahara(koperasiId?: string)`
Convenience function to check bendahara level.

#### `hasPermission(permission: string, koperasiId?: string)`
Check if user has a specific permission.

#### `getHighestRole(koperasiId?: string)`
Get the highest role level for the user.

## API Endpoints

### GET /api/auth/roles

Get all active roles for the current authenticated user.

**Query Parameters:**
- `koperasi_id` (optional): Filter roles by koperasi_id

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "koperasi_id": "uuid",
      "user_id": "uuid",
      "member_id": "uuid",
      "role": "anggota",
      "permissions": [],
      "is_active": true,
      "valid_from": "2025-12-16T10:00:00Z",
      "valid_until": null
    }
  ],
  "count": 1
}
```

### POST /api/admin/roles/assign

Assign a role to a user (admin only).

**Body:**
```json
{
  "user_id": "uuid",
  "koperasi_id": "uuid",
  "role": "anggota",
  "member_id": "uuid (optional)",
  "permissions": ["permission1", "permission2"],
  "valid_until": "2026-12-31T23:59:59Z (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* user_role object */ },
  "message": "Role assigned successfully"
}
```

### POST /api/admin/members/approve

Approve a member registration and auto-assign 'anggota' role.

**Body:**
```json
{
  "member_id": "uuid",
  "koperasi_id": "uuid"
}
```

**Actions:**
1. Update member status from 'pending' to 'active'
2. Set `tanggal_aktif` to current date
3. Auto-assign role 'anggota' to the user

**Response:**
```json
{
  "success": true,
  "message": "Member approved successfully. Role \"anggota\" has been assigned.",
  "data": {
    "member_id": "uuid",
    "status": "active",
    "role_assigned": true
  }
}
```

## Middleware

### Location: `middleware.ts`

Middleware protects routes based on authentication and roles:

- **`/admin/*`** - Requires admin role
- **`/pengurus/*`** - Requires pengurus, ketua, or admin role
- **`/bendahara/*`** - Requires bendahara, ketua, or admin role
- **`/member/*`** - Requires authentication (any role)
- **`/api/admin/*`** - Requires admin role
- **`/api/pengurus/*`** - Requires pengurus level role

**Public Routes:**
- `/`, `/register`, `/login`
- `/api/auth/login`, `/api/auth/signup`

## Usage Examples

### In API Route Handler

```typescript
import { isAdmin, hasRole } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check admin role
  const koperasiId = request.nextUrl.searchParams.get('koperasi_id');
  if (!(await isAdmin(koperasiId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with admin-only logic
}
```

### In Server Component

```typescript
import { getUserRoles } from '@/lib/auth/roles';

export default async function AdminPage() {
  const roles = await getUserRoles();
  const isAdmin = roles.some(r => r.role === 'admin');
  
  if (!isAdmin) {
    redirect('/unauthorized');
  }
  
  return <div>Admin Content</div>;
}
```

### In Client Component

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function RoleDisplay() {
  const [roles, setRoles] = useState([]);
  
  useEffect(() => {
    fetch('/api/auth/roles')
      .then(res => res.json())
      .then(data => setRoles(data.data));
  }, []);
  
  return (
    <div>
      {roles.map(role => (
        <div key={role.id}>{role.role}</div>
      ))}
    </div>
  );
}
```

## Security Considerations

1. **RLS is the Last Security Boundary**
   - All role checks should be verified at database level
   - Application-level checks are for UX, not security

2. **Role Assignment**
   - Only admins can assign roles
   - RLS policy enforces this at database level
   - Application-level check is for early rejection

3. **Role Validation**
   - Roles are validated against enum type
   - Invalid roles are rejected at API level

4. **Permission System**
   - Permissions stored as JSONB array
   - Wildcard permission (`*`) grants all permissions
   - Admin role implicitly has all permissions

## Testing

### E2E Tests
Location: `tests/e2e/rbac.spec.ts`

Tests cover:
- Route protection (admin, pengurus, bendahara routes)
- API endpoint protection
- Role assignment flow
- Member approval flow

### Manual Testing Checklist

- [ ] User can see their own roles via `/api/auth/roles`
- [ ] Admin can assign roles via `/api/admin/roles/assign`
- [ ] Non-admin cannot assign roles (403 error)
- [ ] Admin can approve members via `/api/admin/members/approve`
- [ ] Approved members automatically get 'anggota' role
- [ ] Middleware redirects unauthorized users to login
- [ ] Admin routes are protected
- [ ] Pengurus routes are protected
- [ ] Member routes require authentication

## Migration

### File: `supabase/migrations/20251216130000_016_rls_policies_user_role.sql`

This migration:
1. Enables RLS on `user_role` table
2. Creates policies for SELECT, INSERT, UPDATE, DELETE
3. Ensures only admins can manage roles

**To apply:**
```bash
supabase migration up
```

## Related Files

- `src/lib/auth/roles.ts` - RBAC helper functions
- `src/app/api/auth/roles/route.ts` - Get roles API
- `src/app/api/admin/roles/assign/route.ts` - Assign roles API
- `src/app/api/admin/members/approve/route.ts` - Approve member API
- `middleware.ts` - Route protection middleware
- `supabase/migrations/20251216130000_016_rls_policies_user_role.sql` - RLS policies

## Future Enhancements

1. **Permission Granularity**: More granular permissions per role
2. **Role Templates**: Predefined role templates with permissions
3. **Role Delegation**: Allow temporary role assignment
4. **Audit Logging**: Log all role changes
5. **Role Expiration**: Automatic role expiration based on `valid_until`
6. **Multi-Koperasi Support**: Better handling of users with roles in multiple koperasi


