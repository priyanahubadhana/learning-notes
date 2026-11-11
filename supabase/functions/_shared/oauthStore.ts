/**
 * The OAuth store on Supabase tables (see supabase/migrations/
 * 20261111000001_oauth.sql), through the REST API with the service role. The
 * service key is passed in by the function (Supabase provides it); it is never
 * written in code. The two atomic steps (a code used once, a refresh token
 * rotated once) are single requests the database runs as one statement.
 */
import type { ClientRec, CodeRec, OAuthStore, TokenRec } from './oauth.ts'

type Fetch = typeof fetch
const iso = (ms: number) => new Date(ms).toISOString()

interface TokenRow {
  hash: string
  kind: 'access' | 'refresh'
  family: string
  client_id: string
  user_id: string
  scopes: string[]
  audience: string
  expires_at: string
  used_at: string | null
}
const toToken = (r: TokenRow): TokenRec => ({
  hash: r.hash,
  kind: r.kind,
  family: r.family,
  clientId: r.client_id,
  userId: r.user_id,
  scopes: r.scopes,
  audience: r.audience,
  expiresAt: Date.parse(r.expires_at),
  usedAt: r.used_at ? Date.parse(r.used_at) : null,
})

export function supabaseOAuthStore(
  supabaseUrl: string,
  serviceKey: string,
  doFetch: Fetch = fetch,
): OAuthStore {
  const base = `${supabaseUrl}/rest/v1`
  const headers = (extra: Record<string, string> = {}) => ({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  })
  const q = encodeURIComponent
  async function call(path: string, init: RequestInit): Promise<Response> {
    const res = await doFetch(`${base}${path}`, init)
    if (!res.ok) throw new Error(`store ${res.status}`)
    return res
  }
  return {
    async countClients() {
      const res = await call('/oauth_clients?select=id', {
        method: 'HEAD',
        headers: headers({ Prefer: 'count=exact' }),
      })
      const range = res.headers.get('content-range') ?? ''
      return Number(range.split('/')[1]) || 0
    },
    async putClient(c: ClientRec) {
      await call('/oauth_clients', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          id: c.id,
          name: c.name,
          redirect_uris: c.redirectUris,
          created_at: iso(c.createdAt),
        }),
      })
    },
    async getClient(id) {
      const res = await call(`/oauth_clients?id=eq.${q(id)}&select=*`, {
        headers: headers(),
      })
      const [r] = (await res.json()) as {
        id: string
        name: string
        redirect_uris: string[]
        created_at: string
      }[]
      return r
        ? {
            id: r.id,
            name: r.name,
            redirectUris: r.redirect_uris,
            createdAt: Date.parse(r.created_at),
          }
        : null
    },
    async putCode(c: CodeRec) {
      await call('/oauth_codes', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          hash: c.hash,
          client_id: c.clientId,
          user_id: c.userId,
          redirect_uri: c.redirectUri,
          challenge: c.challenge,
          scopes: c.scopes,
          audience: c.audience,
          expires_at: iso(c.expiresAt),
        }),
      })
    },
    async takeCode(hash) {
      // DELETE ... RETURNING: only one caller can ever get the row.
      const res = await call(`/oauth_codes?hash=eq.${q(hash)}`, {
        method: 'DELETE',
        headers: headers({ Prefer: 'return=representation' }),
      })
      const [r] = (await res.json()) as {
        hash: string
        client_id: string
        user_id: string
        redirect_uri: string
        challenge: string
        scopes: string[]
        audience: string
        expires_at: string
      }[]
      return r
        ? {
            hash: r.hash,
            clientId: r.client_id,
            userId: r.user_id,
            redirectUri: r.redirect_uri,
            challenge: r.challenge,
            scopes: r.scopes,
            audience: r.audience,
            expiresAt: Date.parse(r.expires_at),
          }
        : null
    },
    async putToken(t: TokenRec) {
      await call('/oauth_tokens', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          hash: t.hash,
          kind: t.kind,
          family: t.family,
          client_id: t.clientId,
          user_id: t.userId,
          scopes: t.scopes,
          audience: t.audience,
          expires_at: iso(t.expiresAt),
          used_at: t.usedAt === null ? null : iso(t.usedAt),
        }),
      })
    },
    async getToken(hash) {
      const res = await call(`/oauth_tokens?hash=eq.${q(hash)}&select=*`, {
        headers: headers(),
      })
      const [r] = (await res.json()) as TokenRow[]
      return r ? toToken(r) : null
    },
    async claimRefresh(hash, now) {
      // UPDATE ... WHERE used_at IS NULL RETURNING: one winner per token.
      const res = await call(
        `/oauth_tokens?hash=eq.${q(hash)}&kind=eq.refresh&used_at=is.null`,
        {
          method: 'PATCH',
          headers: headers({ Prefer: 'return=representation' }),
          body: JSON.stringify({ used_at: iso(now) }),
        },
      )
      const [r] = (await res.json()) as TokenRow[]
      return r ? toToken(r) : null
    },
    async revokeFamily(family) {
      await call(`/oauth_tokens?family=eq.${q(family)}`, {
        method: 'DELETE',
        headers: headers(),
      })
    },
    async revokeUser(userId) {
      await call(`/oauth_tokens?user_id=eq.${q(userId)}`, {
        method: 'DELETE',
        headers: headers(),
      })
    },
    async listGrants(userId, now) {
      const res = await call(
        `/oauth_tokens?user_id=eq.${q(userId)}&kind=eq.refresh&used_at=is.null&expires_at=gt.${q(iso(now))}&select=*`,
        { headers: headers() },
      )
      return ((await res.json()) as TokenRow[]).map(toToken)
    },
  }
}

/** Checks a Supabase sign-in token with Supabase Auth; null if it is not valid. */
export async function supabaseVerifyUser(
  supabaseUrl: string,
  anonKey: string,
  token: string,
  doFetch: Fetch = fetch,
): Promise<{ id: string; email: string } | null> {
  const res = await doFetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const u = (await res.json()) as { id?: string; email?: string }
  return u.id && u.email ? { id: u.id, email: u.email } : null
}
