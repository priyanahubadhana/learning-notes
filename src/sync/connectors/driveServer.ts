import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'
import { driveNote } from './driveDiag'

/**
 * Client side of the Drive pass keeper (Supabase function `drive-token`):
 * the server holds Google's long-lived refresh token (locked, per account),
 * so a new one-hour Drive pass never needs Google's cookies or a window.
 * Every answer is one of five words; nothing here throws.
 */

export type ServerPass =
  | { kind: 'ok'; token: string; expiresAt: number }
  /** Nothing stored yet (or the function is not set up): use the old way. */
  | { kind: 'none' }
  /** Google cancelled the access (password change, access removed). */
  | { kind: 'revoked' }
  /** Not deployed / not set up: use the old way and do not ask again soon. */
  | { kind: 'unavailable' }
  /** Offline or a hiccup: try again later. */
  | { kind: 'error' }

const URL_ = `${SUPABASE_URL}/functions/v1/drive-token`

async function post(accessToken: string, body: object): Promise<Response> {
  return fetch(URL_, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function serverPass(accessToken: string): Promise<ServerPass> {
  try {
    const res = await post(accessToken, { action: 'token' })
    if (res.ok) {
      const t = (await res.json()) as {
        access_token?: string
        expires_in?: number
      }
      if (!t.access_token) return { kind: 'error' }
      // A minute of slack, like the old way; the app renews 5 minutes earlier.
      return {
        kind: 'ok',
        token: t.access_token,
        expiresAt: Date.now() + ((t.expires_in ?? 3600) - 60) * 1000,
      }
    }
    if (res.status === 404) {
      // Our function says "none"; a missing function (platform 404) has no
      // JSON error word, so tell the two apart.
      const e = (await res.json().catch(() => ({}))) as { error?: string }
      return e.error === 'none' ? { kind: 'none' } : { kind: 'unavailable' }
    }
    if (res.status === 409) return { kind: 'revoked' }
    if (res.status === 503 || res.status === 403) return { kind: 'unavailable' }
    return { kind: 'error' }
  } catch {
    return { kind: 'error' }
  }
}

/** Hands Google's refresh token (from sign-in) to the server. True = kept. */
export async function storeRefreshToken(
  accessToken: string,
  refreshToken: string,
): Promise<boolean> {
  try {
    const res = await post(accessToken, {
      action: 'store',
      refresh_token: refreshToken,
    })
    driveNote(res.ok ? 'store ok' : `store refused ${res.status}`)
    return res.ok
  } catch {
    driveNote('store failed: could not reach the function')
    return false
  }
}

/** Sign-out / disconnect: Google cancels the token, the server forgets it. */
export async function revokeServerToken(accessToken: string): Promise<void> {
  try {
    await post(accessToken, { action: 'revoke' })
  } catch {
    // Offline: the token stays locked on the server until the next sign-out.
  }
}
