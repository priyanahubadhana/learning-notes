/**
 * OAuth 2.1 for the online Claude connector (plan B). Pure logic: it uses only
 * Web APIs (fetch Request/Response, crypto.subtle), no Deno calls, so Node
 * tests (src/connector/oauth.test.ts) and the Edge Function run the same code.
 *
 * What it is: the "log in with Learning Notes" door that claude.ai needs before
 * it may call our MCP address. Claude never sees a password or the notes key.
 *
 * Rules (the reasons are in docs/features/claude-connector.md):
 *  - public clients only (no client secret); PKCE with S256 is required, plain
 *    is refused
 *  - redirects: https on claude.ai / claude.com (/api/...) only, matched against
 *    the registered list exactly
 *  - the person signs in with the app's own Supabase sign-in on the consent
 *    screen (in the app, not here, because Edge Functions cannot serve HTML);
 *    this module only checks the Supabase token it is handed
 *  - authorization codes: single use, 10 minutes; access tokens: 1 hour, bound
 *    to the MCP address (audience); refresh tokens: 30 days, rotated on every
 *    use, and presenting an old one cancels the whole chain (theft detection)
 *  - tokens are random; only their SHA-256 is stored
 * No secrets live here. The store is given in (Supabase tables in production,
 * memory in tests).
 */

export const SCOPES: Record<string, string> = {
  'notes:read': 'Read your notebooks, pages and recall cards',
  'notes:write':
    'Create notebooks, pages, cards and databases, and add to pages (never delete)',
}
export const DEFAULT_SCOPE = 'notes:read'
export const ACCESS_TTL_S = 3600
export const REFRESH_TTL_S = 30 * 24 * 3600
export const CODE_TTL_S = 600
export const MAX_CLIENTS = 2000
const MAX_BODY = 20_000

export interface ClientRec {
  id: string
  name: string
  redirectUris: string[]
  createdAt: number
}
export interface CodeRec {
  hash: string
  clientId: string
  userId: string
  redirectUri: string
  challenge: string
  scopes: string[]
  audience: string
  expiresAt: number
}
export interface TokenRec {
  hash: string
  kind: 'access' | 'refresh'
  /** One chain per sign-in; revoking it cancels every token in it. */
  family: string
  clientId: string
  userId: string
  scopes: string[]
  audience: string
  expiresAt: number
  /** Refresh tokens: set when used (rotated). A second use = theft. */
  usedAt: number | null
}
export interface OAuthStore {
  countClients(): Promise<number>
  putClient(c: ClientRec): Promise<void>
  getClient(id: string): Promise<ClientRec | null>
  putCode(c: CodeRec): Promise<void>
  /** Atomically removes and returns the code (null if none): single use. */
  takeCode(hash: string): Promise<CodeRec | null>
  putToken(t: TokenRec): Promise<void>
  getToken(hash: string): Promise<TokenRec | null>
  /** Atomically marks an unused refresh token used and returns it (null if already used or unknown). */
  claimRefresh(hash: string, now: number): Promise<TokenRec | null>
  revokeFamily(family: string): Promise<void>
  /** Cancels everything granted to one person (escrow off, "disconnect"). */
  revokeUser(userId: string): Promise<void>
  /** The live (unused, unexpired) refresh token of each connection of one person: the "Connected apps" list. */
  listGrants(userId: string, now: number): Promise<TokenRec[]>
}

export interface OAuthDeps {
  store: OAuthStore
  /** The public address of the function, no trailing slash, e.g. https://x.supabase.co/functions/v1/mcp */
  baseUrl: string
  /** The app, where the consent screen lives, e.g. https://learning-notes-app.pages.dev */
  appUrl: string
  /** Checks a Supabase sign-in token; null = not valid. */
  verifyUser(token: string): Promise<{ id: string; email: string } | null>
  /** Only this account may connect (the app has one owner today). Unset = any signed-in account. */
  allowedEmail?: string
  now?: () => number
}

// ---------- small helpers ----------

const enc = new TextEncoder()
const b64url = (u: Uint8Array): string =>
  btoa(String.fromCharCode(...u))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('')
}
/** The S256 challenge for a verifier (RFC 7636). */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(
    new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))),
  )
}
export function randomToken(prefix: string): string {
  return `${prefix}${b64url(crypto.getRandomValues(new Uint8Array(32)))}`
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

const VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/
const CHALLENGE = /^[A-Za-z0-9\-_]{43}$/

/**
 * A redirect we will ever send a code to: https, claude.ai or claude.com (or
 * their www), no port, no user info, no fragment, a path under /api/.
 */
export function isAllowedRedirect(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length > 500) return false
  let u: URL
  try {
    u = new URL(uri)
  } catch {
    return false
  }
  return (
    u.protocol === 'https:' &&
    ['claude.ai', 'www.claude.ai', 'claude.com', 'www.claude.com'].includes(
      u.hostname,
    ) &&
    u.port === '' &&
    u.username === '' &&
    u.password === '' &&
    u.hash === '' &&
    uri.indexOf('#') === -1 &&
    u.pathname.startsWith('/api/') &&
    !u.pathname.includes('..') &&
    u.href === uri // already in canonical form: no tricks like encoded dots
  )
}

const NO_STORE = { 'Cache-Control': 'no-store', Pragma: 'no-cache' }
const PUBLIC_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'content-type, authorization, mcp-protocol-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...NO_STORE, ...extra },
  })
const oauthError = (
  error: string,
  description: string,
  status = 400,
  extra: Record<string, string> = {},
): Response => json({ error, error_description: description }, status, extra)

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text()
  if (text.length > MAX_BODY) return null
  const type = req.headers.get('content-type') ?? ''
  try {
    if (type.includes('application/json')) {
      const v: unknown = JSON.parse(text)
      return v && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of new URLSearchParams(text)) {
      if (k === '__proto__') continue
      out[k] = v
    }
    return out
  } catch {
    return null
  }
}

const str = (v: unknown, max = 2000): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined

/** Parses a scope string; null if any scope is unknown. */
export function parseScopes(raw: unknown): string[] | null {
  if (raw === undefined || raw === '') return [DEFAULT_SCOPE]
  if (typeof raw !== 'string' || raw.length > 200) return null
  const list = [...new Set(raw.split(/\s+/).filter(Boolean))]
  if (list.length === 0 || list.some((s) => !(s in SCOPES))) return null
  return list
}

// ---------- metadata ----------

export function protectedResourceMetadata(baseUrl: string) {
  return {
    resource: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: Object.keys(SCOPES),
    bearer_methods_supported: ['header'],
    resource_name: 'Learning Notes',
  }
}
export function authServerMetadata(baseUrl: string) {
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: Object.keys(SCOPES),
  }
}

// ---------- registration (RFC 7591) ----------

export async function registerClient(
  deps: OAuthDeps,
  body: Record<string, unknown> | null,
): Promise<Response> {
  if (!body) return oauthError('invalid_client_metadata', 'Send a JSON object.')
  const uris = body.redirect_uris
  if (!Array.isArray(uris) || uris.length < 1 || uris.length > 5) {
    return oauthError('invalid_redirect_uri', 'Send 1 to 5 redirect_uris.')
  }
  if (!uris.every(isAllowedRedirect)) {
    return oauthError(
      'invalid_redirect_uri',
      'Only https://claude.ai and https://claude.com callbacks are allowed.',
    )
  }
  const method = body.token_endpoint_auth_method
  if (method !== undefined && method !== 'none') {
    return oauthError(
      'invalid_client_metadata',
      'Only public clients (token_endpoint_auth_method "none") are supported.',
    )
  }
  const grants = body.grant_types
  if (
    grants !== undefined &&
    (!Array.isArray(grants) ||
      !grants.every((g) => g === 'authorization_code' || g === 'refresh_token'))
  ) {
    return oauthError(
      'invalid_client_metadata',
      'grant_types may be authorization_code and refresh_token.',
    )
  }
  const types = body.response_types
  if (
    types !== undefined &&
    (!Array.isArray(types) || !types.every((r) => r === 'code'))
  ) {
    return oauthError(
      'invalid_client_metadata',
      'response_types may only be code.',
    )
  }
  if ((await deps.store.countClients()) >= MAX_CLIENTS) {
    return oauthError(
      'temporarily_unavailable',
      'Too many registered apps. Try again later.',
      503,
    )
  }
  const name =
    (str(body.client_name, 100) ?? 'An app')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .trim() || 'An app'
  const now = (deps.now ?? Date.now)()
  const rec: ClientRec = {
    id: randomToken('lnc_'),
    name,
    redirectUris: [...new Set(uris as string[])],
    createdAt: now,
  }
  await deps.store.putClient(rec)
  return json(
    {
      client_id: rec.id,
      client_id_issued_at: Math.floor(now / 1000),
      client_name: rec.name,
      redirect_uris: rec.redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    201,
  )
}

// ---------- authorize ----------

export interface AuthRequest {
  client: ClientRec
  redirectUri: string
  state?: string
  challenge: string
  scopes: string[]
}
type Params = Record<string, unknown>

/**
 * Checks an authorization request. A bad client or redirect is a plain error
 * (never redirected: it could be an open redirect); other mistakes carry the
 * redirect so the app can send the person back with an error.
 */
export async function checkAuthRequest(
  deps: OAuthDeps,
  p: Params,
): Promise<
  | { ok: true; req: AuthRequest }
  | { ok: false; fatal: true; message: string }
  | {
      ok: false
      fatal: false
      redirectUri: string
      state?: string
      error: string
      message: string
    }
> {
  const clientId = str(p.client_id, 200)
  const client = clientId ? await deps.store.getClient(clientId) : null
  if (!client) return { ok: false, fatal: true, message: 'Unknown client_id.' }
  const redirectUri = str(p.redirect_uri, 500)
  if (
    !redirectUri ||
    !client.redirectUris.includes(redirectUri) ||
    !isAllowedRedirect(redirectUri)
  ) {
    return {
      ok: false,
      fatal: true,
      message: 'redirect_uri does not match the registered one.',
    }
  }
  const state = str(p.state, 500)
  const soft = (error: string, message: string) =>
    ({ ok: false, fatal: false, redirectUri, state, error, message }) as const
  if (p.response_type !== 'code')
    return soft('unsupported_response_type', 'response_type must be code.')
  const method = p.code_challenge_method
  if (method !== 'S256')
    return soft(
      'invalid_request',
      'PKCE with code_challenge_method=S256 is required.',
    )
  const challenge = str(p.code_challenge, 200)
  if (!challenge || !CHALLENGE.test(challenge))
    return soft('invalid_request', 'code_challenge is missing or malformed.')
  const resource = p.resource
  if (
    resource !== undefined &&
    resource !== '' &&
    resource !== deps.baseUrl &&
    resource !== `${deps.baseUrl}/`
  ) {
    return soft('invalid_target', 'resource must be this connector address.')
  }
  const scopes = parseScopes(p.scope)
  if (!scopes) return soft('invalid_scope', 'Unknown scope.')
  return { ok: true, req: { client, redirectUri, state, challenge, scopes } }
}

function errorRedirect(
  redirectUri: string,
  error: string,
  state?: string,
  description?: string,
): string {
  const u = new URL(redirectUri)
  u.searchParams.set('error', error)
  if (description) u.searchParams.set('error_description', description)
  if (state) u.searchParams.set('state', state)
  return u.toString()
}

/** GET /oauth/authorize: validates, then sends the browser to the app's consent screen. */
async function authorize(deps: OAuthDeps, url: URL): Promise<Response> {
  const p: Params = {}
  for (const [k, v] of url.searchParams) p[k] = v
  const r = await checkAuthRequest(deps, p)
  if (!r.ok && r.fatal) return oauthError('invalid_request', r.message)
  if (!r.ok) {
    return Response.redirect(
      errorRedirect(r.redirectUri, r.error, r.state, r.message),
      302,
    )
  }
  const q = new URLSearchParams()
  q.set('client_id', r.req.client.id)
  q.set('redirect_uri', r.req.redirectUri)
  q.set('code_challenge', r.req.challenge)
  q.set('scope', r.req.scopes.join(' '))
  if (r.req.state) q.set('state', r.req.state)
  return new Response(null, {
    status: 302,
    headers: { Location: `${deps.appUrl}/#/connect?${q}`, ...NO_STORE },
  })
}

/**
 * POST /oauth/consent: the app's consent screen talks to this, signed in as the
 * person (Authorization: Bearer <Supabase token>). Actions: info, approve, deny.
 */
async function consent(
  deps: OAuthDeps,
  req: Request,
  cors: Record<string, string>,
): Promise<Response> {
  const withCors = (r: Response) => {
    for (const [k, v] of Object.entries(cors)) r.headers.set(k, v)
    return r
  }
  const auth = req.headers.get('authorization') ?? ''
  const token = /^Bearer (.+)$/.exec(auth)?.[1]
  const user = token ? await deps.verifyUser(token) : null
  if (!user)
    return withCors(
      oauthError('login_required', 'Sign in to Learning Notes first.', 401),
    )
  if (
    deps.allowedEmail &&
    user.email.toLowerCase() !== deps.allowedEmail.toLowerCase()
  ) {
    return withCors(
      oauthError('access_denied', 'This account may not connect.', 403),
    )
  }
  const body = await readBody(req)
  if (!body)
    return withCors(oauthError('invalid_request', 'Send a JSON object.'))
  const action = body.action
  const r = await checkAuthRequest(deps, body)
  if (!r.ok && r.fatal)
    return withCors(oauthError('invalid_request', r.message))
  if (!r.ok) {
    return withCors(
      json({
        redirect: errorRedirect(r.redirectUri, r.error, r.state, r.message),
      }),
    )
  }
  const { req: a } = r
  if (action === 'info') {
    return withCors(
      json({
        clientName: a.client.name,
        redirectHost: new URL(a.redirectUri).hostname,
        scopes: a.scopes.map((id) => ({ id, label: SCOPES[id] })),
      }),
    )
  }
  if (action === 'deny') {
    return withCors(
      json({
        redirect: errorRedirect(
          a.redirectUri,
          'access_denied',
          a.state,
          'The person said no.',
        ),
      }),
    )
  }
  if (action !== 'approve')
    return withCors(
      oauthError('invalid_request', 'action must be info, approve or deny.'),
    )
  const now = (deps.now ?? Date.now)()
  const code = randomToken('lna_c_')
  await deps.store.putCode({
    hash: await sha256Hex(code),
    clientId: a.client.id,
    userId: user.id,
    redirectUri: a.redirectUri,
    challenge: a.challenge,
    scopes: a.scopes,
    audience: deps.baseUrl,
    expiresAt: now + CODE_TTL_S * 1000,
  })
  const u = new URL(a.redirectUri)
  u.searchParams.set('code', code)
  if (a.state) u.searchParams.set('state', a.state)
  return withCors(json({ redirect: u.toString() }))
}

// ---------- token ----------

async function issue(
  deps: OAuthDeps,
  base: {
    family: string
    clientId: string
    userId: string
    scopes: string[]
    audience: string
  },
  now: number,
): Promise<Response> {
  const access = randomToken('lna_a_')
  const refresh = randomToken('lna_r_')
  await deps.store.putToken({
    ...base,
    hash: await sha256Hex(access),
    kind: 'access',
    expiresAt: now + ACCESS_TTL_S * 1000,
    usedAt: null,
  })
  await deps.store.putToken({
    ...base,
    hash: await sha256Hex(refresh),
    kind: 'refresh',
    expiresAt: now + REFRESH_TTL_S * 1000,
    usedAt: null,
  })
  return json({
    access_token: access,
    token_type: 'Bearer',
    expires_in: ACCESS_TTL_S,
    refresh_token: refresh,
    scope: base.scopes.join(' '),
  })
}

async function token(
  deps: OAuthDeps,
  body: Record<string, unknown> | null,
): Promise<Response> {
  if (!body) return oauthError('invalid_request', 'Send a form or JSON body.')
  const now = (deps.now ?? Date.now)()
  const clientId = str(body.client_id, 200)
  const client = clientId ? await deps.store.getClient(clientId) : null
  if (!client) return oauthError('invalid_client', 'Unknown client_id.', 401)

  if (body.grant_type === 'authorization_code') {
    const code = str(body.code, 200)
    const verifier = str(body.code_verifier, 200)
    if (!code || !verifier || !VERIFIER.test(verifier)) {
      return oauthError(
        'invalid_request',
        'code and a valid code_verifier are required.',
      )
    }
    const rec = await deps.store.takeCode(await sha256Hex(code))
    if (!rec || rec.expiresAt < now || rec.clientId !== client.id) {
      return oauthError(
        'invalid_grant',
        'The code is unknown, used or expired.',
      )
    }
    if (body.redirect_uri !== rec.redirectUri) {
      return oauthError(
        'invalid_grant',
        'redirect_uri does not match the one used to authorize.',
      )
    }
    if (!safeEqual(await pkceChallenge(verifier), rec.challenge)) {
      return oauthError('invalid_grant', 'PKCE check failed.')
    }
    const resource = body.resource
    if (
      resource !== undefined &&
      resource !== '' &&
      resource !== rec.audience &&
      resource !== `${rec.audience}/`
    ) {
      return oauthError(
        'invalid_target',
        'resource must be this connector address.',
      )
    }
    return issue(
      deps,
      {
        family: randomToken('lnf_'),
        clientId: client.id,
        userId: rec.userId,
        scopes: rec.scopes,
        audience: rec.audience,
      },
      now,
    )
  }

  if (body.grant_type === 'refresh_token') {
    const raw = str(body.refresh_token, 200)
    if (!raw) return oauthError('invalid_request', 'refresh_token is required.')
    const hash = await sha256Hex(raw)
    const rec = await deps.store.claimRefresh(hash, now)
    if (!rec) {
      // Unknown, or already used: if used, someone replayed a rotated token.
      const old = await deps.store.getToken(hash)
      if (old && old.kind === 'refresh')
        await deps.store.revokeFamily(old.family)
      return oauthError(
        'invalid_grant',
        'The refresh token is not valid. Connect again.',
      )
    }
    if (
      rec.kind !== 'refresh' ||
      rec.clientId !== client.id ||
      rec.expiresAt < now
    ) {
      await deps.store.revokeFamily(rec.family)
      return oauthError(
        'invalid_grant',
        'The refresh token is not valid. Connect again.',
      )
    }
    let scopes = rec.scopes
    if (body.scope !== undefined) {
      const asked = parseScopes(body.scope)
      if (!asked || !asked.every((s) => rec.scopes.includes(s))) {
        return oauthError('invalid_scope', 'A refresh cannot add scopes.')
      }
      scopes = asked
    }
    return issue(
      deps,
      {
        family: rec.family,
        clientId: rec.clientId,
        userId: rec.userId,
        scopes,
        audience: rec.audience,
      },
      now,
    )
  }
  return oauthError(
    'unsupported_grant_type',
    'Use authorization_code or refresh_token.',
  )
}

/** RFC 7009: cancels the whole chain of a token; always answers 200. */
async function revoke(
  deps: OAuthDeps,
  body: Record<string, unknown> | null,
): Promise<Response> {
  const raw = body ? str(body.token, 200) : undefined
  if (raw) {
    const rec = await deps.store.getToken(await sha256Hex(raw))
    if (rec) await deps.store.revokeFamily(rec.family)
  }
  return json({})
}

// ---------- using an access token (the MCP endpoint calls this) ----------

export interface Grant {
  userId: string
  clientId: string
  scopes: string[]
  family: string
}
/** A live, unexpired access token for this audience, or null. */
export async function verifyAccessToken(
  store: OAuthStore,
  raw: string,
  audience: string,
  now: number = Date.now(),
): Promise<Grant | null> {
  if (!raw.startsWith('lna_a_') || raw.length > 100) return null
  const rec = await store.getToken(await sha256Hex(raw))
  if (
    !rec ||
    rec.kind !== 'access' ||
    rec.expiresAt < now ||
    rec.audience !== audience
  )
    return null
  return {
    userId: rec.userId,
    clientId: rec.clientId,
    scopes: rec.scopes,
    family: rec.family,
  }
}

/** The 401 an unauthenticated MCP call gets, pointing clients at the metadata. */
export function unauthorized(baseUrl: string, error?: string): Response {
  const attrs = [
    `resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
  ]
  if (error) attrs.push(`error="${error}"`)
  return new Response(JSON.stringify({ error: error ?? 'unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer ${attrs.join(', ')}`,
      ...PUBLIC_CORS,
    },
  })
}

// ---------- the router ----------

export const APP_CORS = (
  appUrl: string,
  origin: string | null,
): Record<string, string> => {
  const ok =
    origin === appUrl ||
    (!!origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin))
  return ok
    ? {
        'Access-Control-Allow-Origin': origin!,
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        Vary: 'Origin',
      }
    : { Vary: 'Origin' }
}

/**
 * Handles the OAuth and metadata addresses under `baseUrl`. Returns null when
 * the request is not one of them (the caller then treats it as MCP).
 */
export async function handleOAuth(
  req: Request,
  deps: OAuthDeps,
): Promise<Response | null> {
  const url = new URL(req.url)
  const basePath = new URL(deps.baseUrl).pathname.replace(/\/$/, '')
  if (!url.pathname.startsWith(basePath)) return null
  const rel = url.pathname.slice(basePath.length) || '/'
  const isWellKnown = rel.startsWith('/.well-known/')
  const isOauth = rel.startsWith('/oauth/')
  if (!isWellKnown && !isOauth) return null

  const withPublic = (r: Response) => {
    for (const [k, v] of Object.entries(PUBLIC_CORS)) r.headers.set(k, v)
    return r
  }
  try {
    if (rel === '/oauth/consent') {
      const cors = APP_CORS(deps.appUrl, req.headers.get('origin'))
      if (req.method === 'OPTIONS')
        return new Response(null, { status: 204, headers: cors })
      if (req.method !== 'POST')
        return new Response(null, { status: 405, headers: cors })
      return await consent(deps, req, cors)
    }
    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: PUBLIC_CORS })
    if (isWellKnown && req.method === 'GET') {
      if (rel.startsWith('/.well-known/oauth-protected-resource')) {
        return withPublic(
          json(protectedResourceMetadata(deps.baseUrl), 200, {
            'Cache-Control': 'public, max-age=300',
          }),
        )
      }
      if (
        rel.startsWith('/.well-known/oauth-authorization-server') ||
        rel.startsWith('/.well-known/openid-configuration')
      ) {
        return withPublic(
          json(authServerMetadata(deps.baseUrl), 200, {
            'Cache-Control': 'public, max-age=300',
          }),
        )
      }
      return withPublic(json({ error: 'not_found' }, 404))
    }
    if (rel === '/oauth/authorize' && req.method === 'GET')
      return await authorize(deps, url)
    if (req.method === 'POST') {
      if (rel === '/oauth/register')
        return withPublic(await registerClient(deps, await readBody(req)))
      if (rel === '/oauth/token')
        return withPublic(await token(deps, await readBody(req)))
      if (rel === '/oauth/revoke')
        return withPublic(await revoke(deps, await readBody(req)))
    }
    return withPublic(json({ error: 'not_found' }, 404))
  } catch {
    // Never leak internals.
    return withPublic(
      oauthError('server_error', 'Something went wrong. Try again.', 500),
    )
  }
}

// ---------- a memory store (tests, and a reference for the tables) ----------

export function memoryStore(): OAuthStore & {
  tokens: Map<string, TokenRec>
  codes: Map<string, CodeRec>
} {
  const clients = new Map<string, ClientRec>()
  const codes = new Map<string, CodeRec>()
  const tokens = new Map<string, TokenRec>()
  return {
    tokens,
    codes,
    countClients: async () => clients.size,
    putClient: async (c) => void clients.set(c.id, c),
    getClient: async (id) => clients.get(id) ?? null,
    putCode: async (c) => void codes.set(c.hash, c),
    takeCode: async (h) => {
      const c = codes.get(h) ?? null
      codes.delete(h)
      return c
    },
    putToken: async (t) => void tokens.set(t.hash, t),
    getToken: async (h) => tokens.get(h) ?? null,
    claimRefresh: async (h) => {
      const t = tokens.get(h)
      if (!t || t.kind !== 'refresh' || t.usedAt !== null) return null
      t.usedAt = Date.now()
      return t
    },
    revokeFamily: async (f) => {
      for (const [k, t] of tokens) if (t.family === f) tokens.delete(k)
    },
    revokeUser: async (u) => {
      for (const [k, t] of tokens) if (t.userId === u) tokens.delete(k)
    },
    listGrants: async (u, now) =>
      [...tokens.values()].filter(
        (t) =>
          t.userId === u &&
          t.kind === 'refresh' &&
          t.usedAt === null &&
          t.expiresAt > now,
      ),
  }
}
