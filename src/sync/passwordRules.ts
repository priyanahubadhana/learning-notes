/**
 * Password rules (NIST SP 800-63B-4): when a password is the only factor it
 * needs 15+ characters, long ones (64+) must be allowed, and no rules about
 * mixing letters, digits or symbols. Email codes remain the no-password way.
 */
export const PASSWORD_MIN = 15
export const PASSWORD_MAX = 128
export function passwordProblem(pw: string): 'short' | 'long' | null {
  const n = [...pw].length
  return n < PASSWORD_MIN ? 'short' : n > PASSWORD_MAX ? 'long' : null
}
