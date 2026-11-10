/**
 * Tells a refused sign-in renewal apart from a passing problem. The session
 * is only "gone" when the server says so for certain: 401/403/404, or a 400
 * whose error code names a dead or spent refresh token. Any other 400 (an
 * odd or unreadable reply, a proxy page) is a passing problem and keeps the
 * person signed in. Offline, 429 and 5xx never get here (they are "try
 * later"), and an access token that simply ran out renews with a 200.
 */
const DEAD = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
  'invalid_grant',
])

export function sessionEnded(status: number, body?: unknown): boolean {
  if (status === 401 || status === 403 || status === 404) return true
  if (status !== 400) return false
  const b = (body ?? {}) as { error_code?: unknown; error?: unknown }
  return [b.error_code, b.error].some(
    (c) => typeof c === 'string' && DEAD.has(c),
  )
}
