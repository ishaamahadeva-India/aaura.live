/**
 * Admin utility functions
 */

// Super Admin UID - hardcoded for security
export const SUPER_ADMIN_UID = "9RwsoEEkWPR3Wpv6wKZmhos1xTG2";
export const SUPER_ADMIN_EMAIL = "smr@aaura.com";
const ADMIN_EMAIL_DOMAIN = "@aaura.com";

/**
 * Check if a user is the super admin
 * @param user - Firebase user object
 * @returns true if user is super admin
 */
export function isSuperAdmin(user: { uid: string; email?: string | null } | null | undefined): boolean {
  if (!user) return false;

  // Check by UID (primary method)
  if (user.uid === SUPER_ADMIN_UID) return true;

  // Also check by email as a fallback
  if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;

  return false;
}

/**
 * Determine if the user belongs to the aaura admin domain
 */
export function isCompanyAdmin(user: { email?: string | null } | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN);
}

/**
 * Broader admin check that allows company admins or the sole super admin
 */
export function isAdminUser(user: { uid: string; email?: string | null } | null | undefined): boolean {
  return isSuperAdmin(user) || isCompanyAdmin(user);
}

