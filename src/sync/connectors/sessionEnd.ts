/**
 * Tells a refused sign-in renewal apart from a passing problem. When the
 * token endpoint answers 400, 401, 403 or 404 to a renewal, the server no
 * longer knows the session (it was ended, for example by "Sign out on all
 * devices"). Offline, 429 and 5xx never get here (they are "try later"), and
 * an access token that simply ran out renews with a 200: neither is a
 * remote sign-out.
 */
export function sessionEnded(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404
}
