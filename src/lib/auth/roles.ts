/**
 * Role-Based Access Control (RBAC) Helper Functions
 * 
 * Provides utilities for checking user roles and permissions.
 * Works with Supabase Auth and user_role table.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * User role types from database enum
 */
export type UserRoleType =
  | 'admin'
  | 'pengurus'
  | 'bendahara'
  | 'ketua'
  | 'wakil_ketua'
  | 'wakil_ketua_usaha'
  | 'wakil_ketua_keanggotaan'
  | 'sekretaris'
  | 'anggota'
  | 'staff';

/**
 * Role hierarchy (higher number = more privileges)
 * Used for permission checks
 */
export const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  admin: 100,
  ketua: 90,
  wakil_ketua: 85,
  wakil_ketua_usaha: 85,
  wakil_ketua_keanggotaan: 85,
  pengurus: 80,
  sekretaris: 75,
  bendahara: 75,
  staff: 50,
  anggota: 10,
};

/**
 * Interface for user role data
 */
export interface UserRole {
  id: string;
  koperasi_id: string;
  user_id: string;
  member_id: string | null;
  role: UserRoleType;
  permissions: string[];
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
}

/**
 * Get all active roles for the current authenticated user
 * 
 * @param koperasiId Optional koperasi_id filter
 * @returns Array of UserRole objects
 */
export async function getUserRoles(
  koperasiId?: string
): Promise<UserRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from('user_role')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .gte('valid_from', new Date().toISOString())
    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`);

  if (koperasiId) {
    query = query.eq('koperasi_id', koperasiId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }

  return (data || []).map((role) => ({
    ...role,
    permissions: (role.permissions as string[]) || [],
  }));
}

/**
 * Check if user has a specific role
 * 
 * @param role Role to check
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user has the role
 */
export async function hasRole(
  role: UserRoleType,
  koperasiId?: string
): Promise<boolean> {
  const roles = await getUserRoles(koperasiId);
  return roles.some((r) => r.role === role && r.is_active);
}

/**
 * Check if user has any of the specified roles
 * 
 * @param roles Array of roles to check
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user has at least one of the roles
 */
export async function hasAnyRole(
  roles: UserRoleType[],
  koperasiId?: string
): Promise<boolean> {
  const userRoles = await getUserRoles(koperasiId);
  const userRoleTypes = userRoles.map((r) => r.role);
  return roles.some((role) => userRoleTypes.includes(role));
}

/**
 * Check if user has all of the specified roles
 * 
 * @param roles Array of roles to check
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user has all of the roles
 */
export async function hasAllRoles(
  roles: UserRoleType[],
  koperasiId?: string
): Promise<boolean> {
  const userRoles = await getUserRoles(koperasiId);
  const userRoleTypes = userRoles.map((r) => r.role);
  return roles.every((role) => userRoleTypes.includes(role));
}

/**
 * Check if user has a role with minimum hierarchy level
 * 
 * @param minLevel Minimum hierarchy level required
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user has a role with at least the specified level
 */
export async function hasMinRoleLevel(
  minLevel: number,
  koperasiId?: string
): Promise<boolean> {
  const roles = await getUserRoles(koperasiId);
  return roles.some(
    (r) => ROLE_HIERARCHY[r.role] >= minLevel && r.is_active
  );
}

/**
 * Check if user is admin
 * 
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user is admin
 */
export async function isAdmin(koperasiId?: string): Promise<boolean> {
  return hasRole('admin', koperasiId);
}

/**
 * Check if user is pengurus (pengurus, ketua, or admin)
 * 
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user is pengurus level or higher
 */
export async function isPengurus(koperasiId?: string): Promise<boolean> {
  return hasAnyRole(['admin', 'ketua', 'wakil_ketua', 'wakil_ketua_usaha', 'wakil_ketua_keanggotaan', 'pengurus'], koperasiId);
}

/**
 * Check if user is bendahara or higher
 * 
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user is bendahara level or higher
 */
export async function isBendahara(koperasiId?: string): Promise<boolean> {
  return hasAnyRole(['admin', 'ketua', 'bendahara'], koperasiId);
}

/**
 * Get the highest role level for the user
 * 
 * @param koperasiId Optional koperasi_id filter
 * @returns Highest role type or null if no roles
 */
export async function getHighestRole(
  koperasiId?: string
): Promise<UserRoleType | null> {
  const roles = await getUserRoles(koperasiId);
  if (roles.length === 0) {
    return null;
  }

  const sortedRoles = roles.sort(
    (a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]
  );
  return sortedRoles[0].role;
}

/**
 * Check if user has a specific permission
 * 
 * @param permission Permission string to check
 * @param koperasiId Optional koperasi_id filter
 * @returns true if user has the permission
 */
export async function hasPermission(
  permission: string,
  koperasiId?: string
): Promise<boolean> {
  const roles = await getUserRoles(koperasiId);
  return roles.some((r) => {
    if (!r.is_active) return false;
    return (
      r.permissions.includes(permission) ||
      r.permissions.includes('*') || // Wildcard permission
      r.role === 'admin' // Admin has all permissions
    );
  });
}



