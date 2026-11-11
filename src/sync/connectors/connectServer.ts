import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

/**
 * Client side of the online Claude connector's consent step (Supabase
 * function `mcp`, address `/oauth/consent`). The person is signed in; the
 * function checks that and the request again. Nothing here throws.
 */

const URL_ = `${SUPABASE_URL}/functions/v1/mcp/oauth/consent`

export interface ConsentInfo {
  clientName: string
  redirectHost: string
  scopes: { id: string; label: string }[]
}
export type ConsentReply<T> =
  { ok: true; value: T } | { ok: false; reason: 'login' | 'bad' | 'error' }

async function consent<T>(
  accessToken: string,
  action: 'info' | 'approve' | 'deny',
  params: object,
): Promise<ConsentReply<T>> {
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        action,
        response_type: 'code',
        code_challenge_method: 'S256',
      }),
    })
    if (res.status === 401 || res.status === 403)
      return { ok: false, reason: 'login' }
    if (res.status >= 400 && res.status < 500)
      return { ok: false, reason: 'bad' }
    if (!res.ok) return { ok: false, reason: 'error' }
    return { ok: true, value: (await res.json()) as T }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export const consentInfo = (t: string, p: object) =>
  consent<ConsentInfo>(t, 'info', p)
/** Approve or deny: the reply holds the address to send the browser to. */
export const consentDecide = (
  t: string,
  action: 'approve' | 'deny',
  p: object,
) => consent<{ redirect: string }>(t, action, p)
