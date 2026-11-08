import {
  ALLOWED_EMAIL,
  DRIVE_SCOPE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './config'
import { renewDriveToken } from './google'
import {
  NotAllowedError,
  TryLaterError,
  type Account,
  type AuthProvider,
  type PushItem,
  type PushResult,
  type RecordStore,
  type RemoteRecord,
} from './types'

/**
 * Supabase connector (L3, L4): Google sign-in through Supabase Auth (PKCE
 * redirect, so it works in the installed iPad app, tested 2 Nov) and the
 * encrypted record store (Postgres through its REST API). Plain `fetch`, no
 * SDK: a small download and nothing else can call the server.
 *
 * The session lives in this browser's localStorage only, never in the notes
 * database, so it is never in a backup. Signing in or out never touches the
 * notes.
 */

const SESSION = 'learning-notes:sync.session'
const VERIFIER = 'learning-notes:sync.pkce'

interface Session {
  access: string
  refresh: string
  /** ms */
  expiresAt: number
  account: Account
  drive?: { token: string; expiresAt: number }
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}
function store(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION, JSON.stringify(s))
    else localStorage.removeItem(SESSION)
  } catch {
    // Storage blocked: the session lasts for this page only.
  }
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new TryLaterError('offline')
  }
  if (res.status >= 500 || res.status === 429)
    throw new TryLaterError(`server ${res.status}`)
  return res
}

interface TokenReply {
  access_token: string
  refresh_token: string
  expires_in: number
  provider_token?: string
  user: {
    id: string
    email?: string
    user_metadata?: { sub?: string; provider_id?: string }
  }
}

function toSession(r: TokenReply, old?: Session | null): Session {
  const email = (r.user.email ?? '').toLowerCase()
  if (email !== ALLOWED_EMAIL) throw new NotAllowedError(email)
  return {
    access: r.access_token,
    refresh: r.refresh_token,
    expiresAt: Date.now() + r.expires_in * 1000,
    account: {
      accountId: r.user.id,
      email,
      sub: r.user.user_metadata?.sub ?? r.user.user_metadata?.provider_id ?? '',
    },
    drive: r.provider_token
      ? { token: r.provider_token, expiresAt: Date.now() + 55 * 60_000 }
      : old?.drive,
  }
}

/**
 * The Google sign-in address. `prompt=select_account` makes Google always
 * show the account chooser, so a second Google account on the device is
 * never picked silently (Supabase passes extra query values on to Google).
 */
export function authorizeUrl(redirectTo: string, challenge: string): URL {
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`)
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', redirectTo)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 's256')
  url.searchParams.set('scopes', DRIVE_SCOPE)
  url.searchParams.set('login_hint', ALLOWED_EMAIL)
  url.searchParams.set('prompt', 'select_account')
  return url
}

export function supabaseAuth(): AuthProvider {
  let session = load()

  const refresh = async () => {
    if (!session) throw new NotAllowedError('signed out')
    const res = await call('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh }),
    })
    if (!res.ok) {
      session = null
      store(null)
      throw new NotAllowedError('session ended')
    }
    session = toSession((await res.json()) as TokenReply, session)
    store(session)
  }

  return {
    current: () => session?.account ?? null,

    async signIn() {
      const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)))
      sessionStorage.setItem(VERIFIER, verifier)
      localStorage.setItem(VERIFIER, verifier) // the redirect may open a new tab
      const challenge = b64url(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(verifier),
          ),
        ),
      )
      const back = new URL(location.href)
      back.search = '?sync=callback'
      back.hash = ''
      const url = authorizeUrl(back.toString(), challenge)
      location.assign(url.toString())
    },

    async finishSignIn(url: URL) {
      const code = url.searchParams.get('code')
      if (url.searchParams.get('sync') !== 'callback') return false
      const error = url.searchParams.get('error_description')
      if (!code) throw new NotAllowedError(error ?? 'no code')
      const verifier =
        sessionStorage.getItem(VERIFIER) ?? localStorage.getItem(VERIFIER)
      if (!verifier) throw new NotAllowedError('no verifier')
      const res = await call('/auth/v1/token?grant_type=pkce', {
        method: 'POST',
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      })
      sessionStorage.removeItem(VERIFIER)
      localStorage.removeItem(VERIFIER)
      if (!res.ok) throw new NotAllowedError(`sign-in ${res.status}`)
      session = toSession((await res.json()) as TokenReply)
      store(session)
      return true
    },

    async signOut() {
      const s = session
      session = null
      store(null)
      if (s)
        await call('/auth/v1/logout', {
          method: 'POST',
          token: s.access,
        }).catch(() => undefined)
    },

    async accessToken() {
      if (!session) throw new NotAllowedError('signed out')
      if (session.expiresAt - Date.now() < 60_000) await refresh()
      return session!.access
    },

    async driveToken(interactive) {
      if (!session) return null
      const d = session.drive
      if (d && d.expiresAt - Date.now() > 60_000) return d.token
      // Supabase renews only its own session; Drive needs its own pass
      // (2 Nov test). Renew through Google, quietly first.
      const fresh = await renewDriveToken(session.account.email, interactive)
      if (!fresh) return null
      session = { ...session, drive: fresh }
      store(session)
      return fresh.token
    },
  }
}

export function supabaseRecords(auth: AuthProvider): RecordStore {
  const authed = async (path: string, init: RequestInit = {}) => {
    let res = await call(path, { ...init, token: await auth.accessToken() })
    if (res.status === 401) {
      // The token may have just run out: renew once and retry.
      res = await call(path, { ...init, token: await auth.accessToken() })
    }
    if (res.status === 401 || res.status === 403)
      throw new NotAllowedError(`denied ${res.status}`)
    if (!res.ok) throw new TryLaterError(`store ${res.status}`)
    return res
  }

  const rows = async (query: string) => {
    const res = await authed(
      `/rest/v1/sync_records?select=id,rev,key_id,data,seq&${query}`,
    )
    const list = (await res.json()) as {
      id: string
      rev: number
      key_id: string
      data: string
      seq: number
    }[]
    return list.map((r): RemoteRecord => ({
      id: r.id,
      rev: r.rev,
      keyId: r.key_id,
      data: r.data,
      seq: Number(r.seq),
    }))
  }

  return {
    pull: (sinceSeq, limit) =>
      rows(
        `seq=gt.${Math.floor(sinceSeq)}&order=seq.asc&limit=${Math.floor(limit)}`,
      ),

    async get(ids) {
      const safe = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id))
      return safe.length === 0
        ? []
        : rows(`id=in.(${safe.map((id) => `"${id}"`).join(',')})`)
    },

    async push(items: PushItem[]): Promise<PushResult> {
      const res = await authed('/rest/v1/rpc/sync_push', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            id: i.id,
            base_rev: i.baseRev,
            key_id: i.keyId,
            data: i.data,
          })),
        }),
      })
      const out = (await res.json()) as {
        accepted: { id: string; rev: number; seq: number }[]
        conflicts: string[]
      }
      return {
        accepted: out.accepted.map((a) => ({ ...a, seq: Number(a.seq) })),
        conflicts: out.conflicts,
      }
    },

    async listKeyBundles() {
      const res = await authed('/rest/v1/sync_key_bundles?select=data')
      return ((await res.json()) as { data: string }[]).map((r) => r.data)
    },

    async putKeyBundle(id, json) {
      await authed('/rest/v1/sync_key_bundles', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ id, data: json }),
      })
    },

    async deleteKeyBundle(id) {
      await authed(
        `/rest/v1/sync_key_bundles?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } },
      )
    },

    async serverTime() {
      const res = await authed('/rest/v1/rpc/sync_now', {
        method: 'POST',
        body: '{}',
      })
      return Number(await res.json())
    },
  }
}
