/**
 * The Drive pass keeper (Supabase Edge Function logic, no Deno calls so it can
 * be tested). One address, three jobs, always for the signed-in owner only:
 *   status - says whether a token is kept (never the token), so the app's
 *            "Drive: stays connected" line is the server's truth
 *   store  - keeps the Google refresh token, locked (AES-GCM), one per account
 *   token  - trades the refresh token for a fresh one-hour Drive pass
 *   revoke - tells Google to cancel it and deletes the row
 * Secrets (never in code): GOOGLE_CLIENT_SECRET, DRIVE_TOKEN_KEY. The others
 * (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are given by Supabase itself.
 */

export interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  DRIVE_TOKEN_KEY?: string
  ALLOWED_EMAIL?: string
}
type Fetch = typeof fetch

const enc = new TextEncoder()
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

/** Locks a token for one account (the account id is bound in). */
export async function lockToken(
  secret: string,
  accountId: string,
  token: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: enc.encode(accountId) },
    await aesKey(secret),
    enc.encode(token),
  )
  return `v1.${b64(iv)}.${b64(new Uint8Array(ct))}`
}

export async function unlockToken(
  secret: string,
  accountId: string,
  data: string,
): Promise<string> {
  const [v, iv, ct] = data.split('.')
  if (v !== 'v1' || !iv || !ct) throw new Error('bad format')
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(iv), additionalData: enc.encode(accountId) },
    await aesKey(secret),
    unb64(ct),
  )
  return new TextDecoder().decode(pt)
}

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function handle(
  req: Request,
  env: Env,
  f: Fetch = fetch,
): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'post only' })
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: svc } = env
  const secret = env.GOOGLE_CLIENT_SECRET
  const lockKey = env.DRIVE_TOKEN_KEY
  const clientId = env.GOOGLE_CLIENT_ID
  if (!SUPABASE_URL || !svc || !secret || !lockKey || !clientId)
    return json(503, { error: 'not set up' })

  // Who is asking? Supabase checks the sign-in token; only the owner passes.
  const auth = req.headers.get('Authorization') ?? ''
  if (!/^Bearer .+/.test(auth)) return json(401, { error: 'sign in' })
  const who = await f(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: svc },
  }).catch(() => null)
  if (!who || !who.ok) return json(401, { error: 'sign in' })
  const user = (await who.json()) as {
    id?: string
    email?: string
    is_anonymous?: boolean
  }
  const allowed = (env.ALLOWED_EMAIL ?? '').toLowerCase()
  if (
    !user.id ||
    user.is_anonymous ||
    !allowed ||
    (user.email ?? '').toLowerCase() !== allowed
  )
    return json(403, { error: 'not allowed' })
  const id = user.id

  let body: { action?: string; refresh_token?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json(400, { error: 'bad request' })
  }

  const db = (query = '', init: RequestInit = {}) =>
    f(`${SUPABASE_URL}/rest/v1/drive_tokens${query}`, {
      ...init,
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    })
  const row = `?account_id=eq.${encodeURIComponent(id)}`
  const load = async (): Promise<string | null> => {
    const r = await db(`${row}&select=data`)
    if (!r.ok) throw new Error(`db ${r.status}`)
    const rows = (await r.json()) as { data: string }[]
    return rows[0] ? unlockToken(lockKey, id, rows[0].data) : null
  }

  try {
    if (body.action === 'status') {
      const r = await db(`${row}&select=updated_at`)
      if (!r.ok) return json(502, { error: 'try later' })
      const rows = (await r.json()) as unknown[]
      return json(200, { stored: rows.length > 0 })
    }

    if (body.action === 'store') {
      const t = body.refresh_token
      if (!t || t.length > 2000) return json(400, { error: 'bad token' })
      const r = await db('?on_conflict=account_id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          account_id: id,
          data: await lockToken(lockKey, id, t),
          updated_at: new Date().toISOString(),
        }),
      })
      return r.ok
        ? json(200, { ok: true })
        : json(502, { error: 'save failed' })
    }

    if (body.action === 'token') {
      const refresh = await load()
      if (!refresh) return json(404, { error: 'none' })
      const g = await f('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh,
          client_id: clientId,
          client_secret: secret,
        }),
      })
      if (g.ok) {
        const t = (await g.json()) as {
          access_token?: string
          expires_in?: number
        }
        if (!t.access_token) return json(502, { error: 'google gave no token' })
        return json(200, {
          access_token: t.access_token,
          expires_in: t.expires_in ?? 3600,
        })
      }
      // invalid_grant = the owner removed access / changed the password:
      // forget the dead token so the app asks for one calm reconnect.
      const err = (await g.json().catch(() => ({}))) as { error?: string }
      if (g.status === 400 && err.error === 'invalid_grant') {
        await db(row, { method: 'DELETE' })
        return json(409, { error: 'revoked' })
      }
      return json(502, { error: 'google unavailable' })
    }

    if (body.action === 'revoke') {
      const refresh = await load().catch(() => null)
      if (refresh)
        await f('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: refresh }),
        }).catch(() => null)
      await db(row, { method: 'DELETE' })
      return json(200, { ok: true })
    }
  } catch {
    return json(502, { error: 'try later' })
  }
  return json(400, { error: 'unknown action' })
}
