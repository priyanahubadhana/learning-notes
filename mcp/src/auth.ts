import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import {
  ALLOWED_EMAIL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '../../src/sync/connectors/config'
import type { SecretStore } from './secrets'

/**
 * Sign-in for the connector (Supabase Auth). The same account as the app, so
 * the same row rules apply. Only a small renewal token is kept (in the OS
 * vault); access tokens live in memory.
 */

export class AuthError extends Error {}

export interface Session {
  access: string
  refresh: string
  /** ms since epoch */
  expiresAt: number
  email: string
  accountId: string
}

interface TokenReply {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string; email?: string }
}

export type Fetch = typeof fetch

export function toSession(r: TokenReply, now = Date.now()): Session {
  const email = (r.user.email ?? '').toLowerCase()
  if (email !== ALLOWED_EMAIL)
    throw new AuthError('This account is not allowed to use Learning Notes.')
  return {
    access: r.access_token,
    refresh: r.refresh_token,
    expiresAt: now + r.expires_in * 1000,
    email,
    accountId: r.user.id,
  }
}

async function post(
  f: Fetch,
  path: string,
  body: unknown,
): Promise<TokenReply | null> {
  const res = await f(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (res.status === 429) throw new AuthError('Too many tries. Wait a minute.')
  if (!res.ok) return null
  return (await res.json()) as TokenReply
}

/** Step 1 of the email-code sign-in: the server mails a 6-digit code. */
export async function emailCodeSend(f: Fetch = fetch): Promise<void> {
  const res = await f(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: ALLOWED_EMAIL, create_user: false }),
  })
  if (res.status === 429)
    throw new AuthError('Too many codes asked for. Wait a minute and retry.')
  if (!res.ok) throw new AuthError(`Could not send the code (${res.status}).`)
}

/** Step 2: the code from the mail. */
export async function emailCodeVerify(
  code: string,
  f: Fetch = fetch,
): Promise<Session> {
  const out = await post(f, '/auth/v1/verify', {
    type: 'email',
    email: ALLOWED_EMAIL,
    token: code.trim(),
  })
  if (!out) throw new AuthError('That code did not work. Ask for a new one.')
  return toSession(out)
}

export async function passwordSignIn(
  password: string,
  f: Fetch = fetch,
): Promise<Session> {
  const out = await post(f, '/auth/v1/token?grant_type=password', {
    email: ALLOWED_EMAIL,
    password,
  })
  if (!out) throw new AuthError('Wrong email or password.')
  return toSession(out)
}

// ---- Google (browser) sign-in, setup only -------------------------------

export const GOOGLE_PORT = 53682
export const GOOGLE_REDIRECT = `http://127.0.0.1:${GOOGLE_PORT}/callback`

const b64url = (b: Buffer) =>
  b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export function makePkce() {
  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function googleAuthorizeUrl(challenge: string): string {
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`)
  url.searchParams.set('provider', 'google')
  url.searchParams.set('redirect_to', GOOGLE_REDIRECT)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 's256')
  url.searchParams.set('login_hint', ALLOWED_EMAIL)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

/**
 * Waits (up to 5 minutes) for Google to send the browser back to this PC.
 * A listener on 127.0.0.1 only, open during setup only; never while Claude
 * uses the connector.
 */
export function waitForGoogleCode(timeoutMs = 300_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', GOOGLE_REDIRECT)
      if (url.pathname !== '/callback') {
        res.writeHead(404).end()
        return
      }
      const code = url.searchParams.get('code')
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(
        code
          ? 'Signed in. You can close this tab and go back to the terminal.'
          : 'Sign-in failed. Go back to the terminal.',
      )
      clearTimeout(timer)
      server.close()
      if (code) resolve(code)
      else reject(new AuthError('Google sign-in was not completed.'))
    })
    const timer = setTimeout(() => {
      server.close()
      reject(new AuthError('Timed out waiting for Google sign-in.'))
    }, timeoutMs)
    server.on('error', (e) => {
      clearTimeout(timer)
      reject(new AuthError(`Could not open the sign-in port: ${e.message}`))
    })
    server.listen(GOOGLE_PORT, '127.0.0.1')
  })
}

export async function googleExchange(
  code: string,
  verifier: string,
  f: Fetch = fetch,
): Promise<Session> {
  const out = await post(f, '/auth/v1/token?grant_type=pkce', {
    auth_code: code,
    code_verifier: verifier,
  })
  if (!out) throw new AuthError('Google sign-in could not be finished.')
  return toSession(out)
}

// ---- Keeping and renewing the session -----------------------------------

const REFRESH_KEY = 'refresh'

/** Saves only the renewal token and who it belongs to. */
export async function saveSession(
  store: SecretStore,
  s: Session,
): Promise<void> {
  await store.set(
    REFRESH_KEY,
    JSON.stringify({
      refresh: s.refresh,
      accountId: s.accountId,
      email: s.email,
    }),
  )
}

/** Gives out a fresh access token, renewing (and re-saving) when needed. */
export function sessionKeeper(
  store: SecretStore,
  f: Fetch = fetch,
  now: () => number = Date.now,
) {
  let current: Session | null = null
  let inflight: Promise<string> | null = null

  async function renew(): Promise<string> {
    const raw = await store.get(REFRESH_KEY)
    if (!raw)
      throw new AuthError('Not set up. Run: node mcp/dist/index.js setup')
    const saved = JSON.parse(raw) as { refresh: string }
    const out = await post(f, '/auth/v1/token?grant_type=refresh_token', {
      refresh_token: saved.refresh,
    })
    if (!out)
      throw new AuthError(
        'The sign-in has ended (or was revoked). Run setup again: node mcp/dist/index.js setup',
      )
    current = toSession(out, now())
    // Refresh tokens are single-use: keep the new one at once.
    await saveSession(store, current)
    return current.access
  }

  return {
    async accessToken(): Promise<string> {
      if (current && current.expiresAt - now() > 60_000) return current.access
      inflight ??= renew().finally(() => {
        inflight = null
      })
      return inflight
    },
  }
}
