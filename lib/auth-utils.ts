/**
 * Admin authorization utilities.
 * 
 * Controls which users can add/edit/delete recipes.
 * Admin emails are configured via the NEXT_PUBLIC_ADMIN_EMAILS env variable.
 */

const ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? ''
)
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

/**
 * Returns true if the given email belongs to an admin user.
 */
export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
