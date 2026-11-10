import {
  ALLOWED_EMAIL,
  DRIVE_SCOPE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './config'
import { driveNote, lastDriveNote } from './driveDiag'
import { createDrivePass } from './drivePass'
import { revokeServerToken, serverPass, storeRefreshToken } from './driveServer'
import { preloadGoogle, renewDriveToken } from './google'
import { sessionEnded } from './sessionEnd'
import { failure, parseMethods, serverFailure } from './emailAuth'
import {
  AuthInputError,
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
/** '1' once the server holds Google's refresh token for this account. */
const OFFLINE = 'learning-notes:sync.driveOffline'
/** '1' while a "connect Google" round trip is under way (a failure must not sign out). */
const LINKING = 'learning-notes:sync.linking'
const LINK_ERROR = 'learning-notes:sync.linkError'

function flag(set?: boolean): boolean {
  try {
    if (set === true) localStorage.setItem(OFFLINE, '1')
    else if (set === false) localStorage.removeItem(OFFLINE)
    return localStorage.getItem(OFFLINE) === '1'
  } catch {
    return false
  }
}

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
  if (res.status >= 500 || res.status === 429) {
    // Sign-in steps say why in plain words (mail trouble, too many tries).
    if (path.startsWith('/auth/v1/')) {
      const body = await res
        .clone()
        .json()
        .catch(() => null)
      const kind = serverFailure(res.status, body)
      if (kind) throw new AuthInputError(kind)
    }
    throw new TryLaterError(`server ${res.status}`)
  }
  return res
}

interface TokenReply {
  access_token: string
  refresh_token: string
  expires_in: number
  provider_token?: string
  provider_refresh_token?: string
  user: {
    id: string
    email?: string
    user_metadata?: {
      sub?: string
      provider_id?: string
      avatar_url?: string
      picture?: string
    }
  }
}

/** Only a plain https address is ever used as a picture. */
const httpsOnly = (u?: string) => (u?.startsWith('https://') ? u : undefined)

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
      avatar: httpsOnly(
        r.user.user_metadata?.avatar_url ?? r.user.user_metadata?.picture,
      ),
    },
    drive: r.provider_token
      ? { token: r.provider_token, expiresAt: Date.now() + 59 * 60_000 }
      : old?.drive,
  }
}

/**
 * The Google sign-in address. `prompt=select_account` makes Google always
 * show the account chooser, so a second Google account on the device is
 * never picked silently (Supabase passes extra query values on to Google).
 */
export function authorizeUrl(
  redirectTo: string,
  challenge: string,
  consent = false,
): URL {
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`)
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', redirectTo)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 's256')
  url.searchParams.set('scopes', DRIVE_SCOPE)
  url.searchParams.set('login_hint', ALLOWED_EMAIL)
  // Offline access gives a long-lived refresh token (kept by the server).
  // Google sends it only after a consent screen, so ask for that only when
  // the server does not hold one yet (first time, or after a revoke).
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set(
    'prompt',
    consent ? 'select_account consent' : 'select_account',
  )
  return url
}

export function supabaseAuth(): AuthProvider {
  let session = load()
  let serverOffUntil = 0

  async function pkce() {
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
    return { challenge, back: back.toString() }
  }

  async function startSignIn(consent: boolean) {
    const { challenge, back } = await pkce()
    location.assign(authorizeUrl(back, challenge, consent).toString())
  }

  /** Signed-in person adds Google: the server answers with the Google address. */
  async function startLink() {
    const { challenge, back } = await pkce()
    const url = authorizeUrl(back, challenge, !flag())
    url.pathname = '/auth/v1/user/identities/authorize'
    url.searchParams.delete('login_hint')
    url.searchParams.set('skip_http_redirect', 'true')
    const res = await call(url.pathname + url.search, {
      token: await freshAccess(),
    })
    const out = res.ok ? ((await res.json()) as { url?: string }) : null
    if (!out?.url?.startsWith('https://')) throw new AuthInputError('failed')
    try {
      localStorage.setItem(LINKING, '1')
    } catch {
      // Without storage a failed link may sign out; nothing else breaks.
    }
    location.assign(out.url)
  }

  /** Takes the token reply of an email sign-in step as the new session. */
  async function adopt(res: Response) {
    if (!res.ok) throw await failure(res)
    session = toSession((await res.json()) as TokenReply)
    store(session)
  }
  const post = (path: string, body: unknown, token?: string) =>
    call(path, { method: 'POST', body: JSON.stringify(body), token })

  const endedListeners: (() => void)[] = []
  /** True while the person signs out on purpose: not a remote sign-out. */
  let leaving = false

  const refresh = async () => {
    if (!session) throw new NotAllowedError('signed out')
    const res = await call('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh }),
    })
    if (!res.ok) {
      // Anything but "the session is gone" is a passing problem: keep it.
      if (!sessionEnded(res.status))
        throw new TryLaterError(`server ${res.status}`)
      session = null
      store(null)
      // Only a session ended behind our back counts (not the person's own
      // sign out).
      if (!leaving) for (const fn of endedListeners) fn()
      throw new NotAllowedError('session ended')
    }
    session = toSession((await res.json()) as TokenReply, session)
    store(session)
  }

  const freshAccess = async () => {
    if (session && session.expiresAt - Date.now() < 60_000) await refresh()
    return session!.access
  }

  const pass = createDrivePass({
    get: () => session?.drive,
    set: (drive) => {
      if (!session) return
      session = { ...session, drive }
      store(session)
    },
    renew: async (interactive) => {
      if (!session) return null
      // 1. The server's refresh token: no window, no Google cookies.
      if (Date.now() > serverOffUntil) {
        const r = await serverPass(await freshAccess())
        if (r.kind === 'ok') return r
        if (r.kind === 'error') return null // offline: try again later
        if (r.kind === 'unavailable') serverOffUntil = Date.now() + 10 * 60_000
        if (r.kind === 'revoked' || r.kind === 'none') {
          flag(false)
          // The one calm bar: its tap signs in again WITH consent so the
          // server gets a new refresh token.
          if (interactive) {
            void startSignIn(true)
            return null
          }
        }
      }
      // 2. The old way (Google's token window), until setup is done.
      return renewDriveToken(session.account.email, interactive)
    },
  })

  return {
    current: () => session?.account ?? null,

    signIn: () => startSignIn(!flag()),

    driveLasting: () => (flag() ? 'kept' : 'ask'),
    lastDriveNote,
    // Re-runs Google's consent so the server gets a refresh token.
    setUpLasting: () => startSignIn(true),

    async finishSignIn(url: URL) {
      const code = url.searchParams.get('code')
      if (url.searchParams.get('sync') !== 'callback') return false
      const error = url.searchParams.get('error_description')
      const linking = localStorage.getItem(LINKING) === '1'
      localStorage.removeItem(LINKING)
      if (!code && linking && session) {
        // A failed "connect Google" (already used by another account...):
        // the person stays signed in; Connected accounts shows the reason.
        try {
          sessionStorage.setItem(LINK_ERROR, error ?? 'failed')
        } catch {
          // Shown nowhere then.
        }
        return true
      }
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
      const reply = (await res.json()) as TokenReply
      session = toSession(reply)
      store(session)
      // Google's refresh token goes to the server once (locked there); this
      // device never keeps it.
      if (!reply.provider_refresh_token)
        driveNote(
          'sign-in reply had no Google refresh token (consent screen needed)',
        )
      else
        flag(
          await storeRefreshToken(
            reply.access_token,
            reply.provider_refresh_token,
          ),
        )
      return true
    },

    async emailCodeSend(email) {
      const res = await post('/auth/v1/otp', { email, create_user: true })
      if (!res.ok) throw await failure(res)
    },
    async emailCodeVerify(email, code, kind = 'email') {
      await adopt(
        await post('/auth/v1/verify', { type: kind, email, token: code }),
      )
    },
    async passwordSignIn(email, password) {
      await adopt(
        await post('/auth/v1/token?grant_type=password', { email, password }),
      )
    },
    async passwordSignUp(email, password) {
      const res = await post('/auth/v1/signup', {
        email,
        password,
        data: { has_password: true },
      })
      if (!res.ok) throw await failure(res)
      const out = (await res.json()) as Partial<TokenReply>
      if (!out.access_token) return 'confirm'
      session = toSession(out as TokenReply)
      store(session)
      return 'signedIn'
    },
    async passwordResetSend(email) {
      const res = await post('/auth/v1/recover', { email })
      if (!res.ok) throw await failure(res)
    },
    async setPassword(password) {
      const res = await call('/auth/v1/user', {
        method: 'PUT',
        token: await freshAccess(),
        body: JSON.stringify({ password, data: { has_password: true } }),
      })
      if (!res.ok) throw await failure(res)
    },
    async methods() {
      const res = await call('/auth/v1/user', { token: await freshAccess() })
      if (!res.ok) throw new TryLaterError(`user ${res.status}`)
      return parseMethods(await res.json())
    },
    linkGoogle: startLink,
    async unlinkIdentity(id) {
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new AuthInputError('failed')
      const res = await call(`/auth/v1/user/identities/${id}`, {
        method: 'DELETE',
        token: await freshAccess(),
      })
      if (!res.ok) throw await failure(res)
    },
    takeLinkError() {
      try {
        const e = sessionStorage.getItem(LINK_ERROR)
        sessionStorage.removeItem(LINK_ERROR)
        return e
      } catch {
        return null
      }
    },

    onSessionEnded(fn) {
      endedListeners.push(fn)
    },

    async signOut() {
      const s = session
      leaving = true
      // Cancel Google's long-lived token first (needs a working sign-in).
      if (s && flag())
        await revokeServerToken(await freshAccess().catch(() => s.access))
      session = null
      store(null)
      flag(false)
      leaving = false
      if (s)
        await call('/auth/v1/logout', {
          method: 'POST',
          token: s.access,
        }).catch(() => undefined)
    },

    async signOutEverywhere() {
      const s = session
      if (!s) return true
      leaving = true
      try {
        const token = await freshAccess().catch(() => s.access)
        // Cancel Google's long-lived key first (needs a working sign-in).
        await revokeServerToken(token)
        // scope=global ends every session of this account on every device.
        const res = await call('/auth/v1/logout?scope=global', {
          method: 'POST',
          token,
        })
        // 401/403/404 = the sign-in was already ended: nothing left to end.
        if (!res.ok && ![401, 403, 404].includes(res.status)) return false
      } catch {
        return false // offline: nothing changed, the person can try again
      } finally {
        leaving = false
      }
      session = null
      store(null)
      flag(false)
      return true
    },

    async accessToken() {
      if (!session) throw new NotAllowedError('signed out')
      if (session.expiresAt - Date.now() < 60_000) await refresh()
      return session!.access
    },

    // Supabase renews only its own session; Drive needs its own pass
    // (2 Nov test). It is renewed through Google 5 minutes before it ends.
    async driveToken(interactive) {
      return session ? pass.token(interactive) : null
    },
    dropDriveToken: () => pass.drop(),
    prepareDrive: preloadGoogle,
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
