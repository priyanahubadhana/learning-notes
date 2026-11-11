import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACCESS_TTL_S,
  handleOAuth,
  isAllowedRedirect,
  memoryStore,
  parseScopes,
  pkceChallenge,
  unauthorized,
  verifyAccessToken,
  type OAuthDeps,
} from '../../supabase/functions/_shared/oauth'
import { supabaseOAuthStore } from '../../supabase/functions/_shared/oauthStore'

const BASE = 'https://proj.example.test/functions/v1/mcp'
const APP = 'https://learning-notes-app.pages.dev'
const CB = 'https://claude.ai/api/mcp/auth_callback'
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'

let store: ReturnType<typeof memoryStore>
let clock: number
let deps: OAuthDeps

beforeEach(() => {
  store = memoryStore()
  clock = 1_800_000_000_000
  deps = {
    store,
    baseUrl: BASE,
    appUrl: APP,
    now: () => clock,
    allowedEmail: 'me@example.com',
    verifyUser: async (t) =>
      t === 'good-token'
        ? { id: 'user-1', email: 'me@example.com' }
        : t === 'other-token'
          ? { id: 'user-2', email: 'x@example.com' }
          : null,
  }
})

const call = (
  path: string,
  init: RequestInit & { form?: Record<string, string> } = {},
) => {
  const { form, ...rest } = init
  return handleOAuth(
    new Request(`${BASE}${path}`, {
      ...rest,
      ...(form
        ? {
            method: 'POST',
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              ...(rest.headers as Record<string, string>),
            },
            body: new URLSearchParams(form).toString(),
          }
        : {}),
    }),
    deps,
  ) as Promise<Response>
}
const jpost = (
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  call(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

async function register(redirect = CB) {
  const res = await jpost('/oauth/register', {
    client_name: 'Claude',
    redirect_uris: [redirect],
    token_endpoint_auth_method: 'none',
  })
  return { res, body: (await res.json()) as Record<string, unknown> }
}
async function authorizeParams(
  clientId: string,
  extra: Record<string, string | undefined> = {},
) {
  return {
    client_id: clientId,
    redirect_uri: CB,
    response_type: 'code',
    code_challenge: await pkceChallenge(VERIFIER),
    code_challenge_method: 'S256',
    state: 'xyz',
    scope: 'notes:read notes:write',
    ...extra,
  }
}
/** Registers, approves as the person, returns the code. */
async function getCode(extra: Record<string, string | undefined> = {}) {
  const { body } = await register()
  const clientId = body.client_id as string
  const res = await jpost(
    '/oauth/consent',
    { action: 'approve', ...(await authorizeParams(clientId, extra)) },
    { authorization: 'Bearer good-token' },
  )
  const { redirect } = (await res.json()) as { redirect: string }
  return { clientId, redirect: new URL(redirect), status: res.status }
}
const exchange = (
  clientId: string,
  code: string,
  over: Record<string, string> = {},
) =>
  call('/oauth/token', {
    form: {
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: CB,
      code_verifier: VERIFIER,
      ...over,
    },
  })

describe('PKCE', () => {
  it('matches the RFC 7636 example', async () => {
    expect(await pkceChallenge(VERIFIER)).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })
  it('refuses the plain method and a missing challenge at authorize', async () => {
    const { body } = await register()
    const id = body.client_id as string
    for (const extra of [
      { code_challenge_method: 'plain' },
      { code_challenge_method: '' },
      { code_challenge: 'short' },
    ]) {
      const q = new URLSearchParams(await authorizeParams(id, extra))
      const res = await call(`/oauth/authorize?${q}`)
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toContain('error=invalid_request')
      expect(res.headers.get('location')).toContain(
        encodeURIComponent('state') + '=xyz',
      )
    }
  })
  it('rejects a wrong or malformed verifier at the token step', async () => {
    const { clientId, redirect } = await getCode()
    const code = redirect.searchParams.get('code')!
    const bad = await exchange(clientId, code, {
      code_verifier: 'x'.repeat(43),
    })
    expect(bad.status).toBe(400)
    expect(((await bad.json()) as { error: string }).error).toBe(
      'invalid_grant',
    )
    // the code was spent by the failed try: a right verifier now fails too
    expect((await exchange(clientId, code)).status).toBe(400)
    const c2 = await getCode()
    const short = await exchange(
      c2.clientId,
      c2.redirect.searchParams.get('code')!,
      {
        code_verifier: 'short',
      },
    )
    expect(((await short.json()) as { error: string }).error).toBe(
      'invalid_request',
    )
  })
})

describe('registration', () => {
  it('registers a claude.ai client as a public client', async () => {
    const { res, body } = await register()
    expect(res.status).toBe(201)
    expect(String(body.client_id)).toMatch(/^lnc_/)
    expect(body.token_endpoint_auth_method).toBe('none')
    expect(body.redirect_uris).toEqual([CB])
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('accepts claude.com too', async () => {
    expect(
      (await register('https://claude.com/api/mcp/auth_callback')).res.status,
    ).toBe(201)
  })
  it('rejects a bad redirect', async () => {
    for (const uri of [
      'https://evil.example/cb',
      'http://claude.ai/api/mcp/auth_callback',
      'https://claude.ai.evil.com/api/mcp/auth_callback',
      'https://evilclaude.ai/api/mcp/auth_callback',
      'https://claude.ai@evil.com/api/mcp/auth_callback',
      'https://claude.ai:8443/api/mcp/auth_callback',
      'https://claude.ai/other',
      'https://claude.ai/api/../x',
      'https://claude.ai/api/mcp/auth_callback#frag',
      'javascript:alert(1)',
      'http://localhost:3000/cb',
      '',
    ]) {
      const { res, body } = await register(uri)
      expect(res.status, uri).toBe(400)
      expect(body.error).toBe('invalid_redirect_uri')
    }
    expect(isAllowedRedirect(CB)).toBe(true)
    expect(isAllowedRedirect(42)).toBe(false)
  })
  it('rejects confidential clients, odd grants and junk bodies', async () => {
    for (const extra of [
      { token_endpoint_auth_method: 'client_secret_basic' },
      { grant_types: ['password'] },
      { response_types: ['token'] },
    ]) {
      const res = await jpost('/oauth/register', {
        redirect_uris: [CB],
        ...extra,
      })
      expect(res.status).toBe(400)
    }
    expect((await jpost('/oauth/register', [1])).status).toBe(400)
    expect((await jpost('/oauth/register', { redirect_uris: [] })).status).toBe(
      400,
    )
    expect(
      (await jpost('/oauth/register', { redirect_uris: Array(6).fill(CB) }))
        .status,
    ).toBe(400)
  })
  it('strips markup from the name', async () => {
    const res = await jpost('/oauth/register', {
      client_name: '<b>Claude</b>',
      redirect_uris: [CB],
    })
    expect(((await res.json()) as { client_name: string }).client_name).toBe(
      'bClaude/b',
    )
  })
})

describe('authorize and consent', () => {
  it('sends a valid request to the app consent screen', async () => {
    const { body } = await register()
    const q = new URLSearchParams(
      await authorizeParams(body.client_id as string),
    )
    const res = await call(`/oauth/authorize?${q}`)
    expect(res.status).toBe(302)
    const loc = res.headers.get('location')!
    expect(loc.startsWith(`${APP}/#/connect?`)).toBe(true)
    expect(loc).toContain('code_challenge=')
  })
  it('never redirects on a bad client or redirect', async () => {
    const { body } = await register()
    const id = body.client_id as string
    const p1 = new URLSearchParams(
      await authorizeParams(id, {
        redirect_uri: 'https://claude.ai/api/other',
      }),
    )
    const r1 = await call(`/oauth/authorize?${p1}`)
    expect(r1.status).toBe(400)
    expect(r1.headers.get('location')).toBeNull()
    const p2 = new URLSearchParams(await authorizeParams('nope'))
    expect((await call(`/oauth/authorize?${p2}`)).status).toBe(400)
  })
  it('refuses another audience and unknown scopes', async () => {
    const { body } = await register()
    const id = body.client_id as string
    for (const extra of [
      { resource: 'https://evil.example/mcp' },
      { scope: 'notes:delete' },
    ]) {
      const q = new URLSearchParams(await authorizeParams(id, extra))
      const res = await call(`/oauth/authorize?${q}`)
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toMatch(
        /error=(invalid_target|invalid_scope)/,
      )
    }
    expect(parseScopes(undefined)).toEqual(['notes:read'])
    expect(parseScopes('notes:read notes:read')).toEqual(['notes:read'])
    expect(parseScopes('x')).toBeNull()
  })
  it('consent needs a signed-in, allowed person', async () => {
    const { body } = await register()
    const p = {
      action: 'info',
      ...(await authorizeParams(body.client_id as string)),
    }
    expect((await jpost('/oauth/consent', p)).status).toBe(401)
    expect(
      (await jpost('/oauth/consent', p, { authorization: 'Bearer bad' }))
        .status,
    ).toBe(401)
    expect(
      (
        await jpost('/oauth/consent', p, {
          authorization: 'Bearer other-token',
        })
      ).status,
    ).toBe(403)
    const ok = await jpost('/oauth/consent', p, {
      authorization: 'Bearer good-token',
    })
    const info = (await ok.json()) as {
      clientName: string
      redirectHost: string
      scopes: { id: string; label: string }[]
    }
    expect(info.clientName).toBe('Claude')
    expect(info.redirectHost).toBe('claude.ai')
    expect(info.scopes.map((s) => s.id)).toEqual(['notes:read', 'notes:write'])
    expect(info.scopes[1].label).toContain('never delete')
  })
  it('deny returns access_denied to the redirect', async () => {
    const { body } = await register()
    const res = await jpost(
      '/oauth/consent',
      { action: 'deny', ...(await authorizeParams(body.client_id as string)) },
      { authorization: 'Bearer good-token' },
    )
    const { redirect } = (await res.json()) as { redirect: string }
    expect(redirect).toContain('error=access_denied')
    expect(redirect.startsWith(CB)).toBe(true)
  })
  it('consent answers CORS only to the app origin', async () => {
    const ok = await call('/oauth/consent', {
      method: 'OPTIONS',
      headers: { origin: APP },
    })
    expect(ok.headers.get('access-control-allow-origin')).toBe(APP)
    const no = await call('/oauth/consent', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    })
    expect(no.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('tokens', () => {
  it('runs the whole flow and stores only hashes', async () => {
    const { clientId, redirect } = await getCode()
    expect(redirect.searchParams.get('state')).toBe('xyz')
    const code = redirect.searchParams.get('code')!
    const res = await exchange(clientId, code)
    expect(res.status).toBe(200)
    const t = (await res.json()) as Record<string, string | number>
    expect(t.token_type).toBe('Bearer')
    expect(t.expires_in).toBe(ACCESS_TTL_S)
    expect(t.scope).toBe('notes:read notes:write')
    for (const rec of [...store.tokens.values(), ...store.codes.values()]) {
      expect(JSON.stringify(rec)).not.toContain(String(t.access_token))
      expect(JSON.stringify(rec)).not.toContain(String(t.refresh_token))
      expect(rec.hash).toMatch(/^[0-9a-f]{64}$/)
    }
    const grant = await verifyAccessToken(
      store,
      String(t.access_token),
      BASE,
      clock,
    )
    expect(grant?.userId).toBe('user-1')
    expect(grant?.scopes).toEqual(['notes:read', 'notes:write'])
  })
  it('a code works once only', async () => {
    const { clientId, redirect } = await getCode()
    const code = redirect.searchParams.get('code')!
    expect((await exchange(clientId, code)).status).toBe(200)
    expect((await exchange(clientId, code)).status).toBe(400)
  })
  it('a code expires after 10 minutes and needs the same redirect and client', async () => {
    const a = await getCode()
    clock += 11 * 60_000
    expect(
      (await exchange(a.clientId, a.redirect.searchParams.get('code')!)).status,
    ).toBe(400)
    const b = await getCode()
    expect(
      (
        await exchange(b.clientId, b.redirect.searchParams.get('code')!, {
          redirect_uri: 'https://claude.com/api/mcp/auth_callback',
        })
      ).status,
    ).toBe(400)
    const c = await getCode()
    const other = (await register()).body.client_id as string
    expect(
      (await exchange(other, c.redirect.searchParams.get('code')!)).status,
    ).toBe(400)
  })
  it('the access token lasts an hour and is bound to the audience', async () => {
    const { clientId, redirect } = await getCode()
    const t = (await (
      await exchange(clientId, redirect.searchParams.get('code')!)
    ).json()) as { access_token: string }
    expect(
      await verifyAccessToken(store, t.access_token, BASE, clock + 3_599_000),
    ).not.toBeNull()
    expect(
      await verifyAccessToken(store, t.access_token, BASE, clock + 3_601_000),
    ).toBeNull()
    expect(
      await verifyAccessToken(
        store,
        t.access_token,
        'https://other.example/mcp',
        clock,
      ),
    ).toBeNull()
    expect(await verifyAccessToken(store, 'junk', BASE, clock)).toBeNull()
    expect(
      await verifyAccessToken(store, 'lna_a_' + 'x'.repeat(60), BASE, clock),
    ).toBeNull()
  })
  it('a refresh token rotates and cannot be used as an access token', async () => {
    const { clientId, redirect } = await getCode()
    const t1 = (await (
      await exchange(clientId, redirect.searchParams.get('code')!)
    ).json()) as { access_token: string; refresh_token: string }
    expect(
      await verifyAccessToken(store, t1.refresh_token, BASE, clock),
    ).toBeNull()
    const r2 = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: t1.refresh_token,
      },
    })
    expect(r2.status).toBe(200)
    const t2 = (await r2.json()) as {
      access_token: string
      refresh_token: string
    }
    expect(t2.refresh_token).not.toBe(t1.refresh_token)
    expect(
      await verifyAccessToken(store, t2.access_token, BASE, clock),
    ).not.toBeNull()
    const r3 = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: t2.refresh_token,
      },
    })
    expect(r3.status).toBe(200)
  })
  it('re-using an old refresh token cancels the whole chain', async () => {
    const { clientId, redirect } = await getCode()
    const t1 = (await (
      await exchange(clientId, redirect.searchParams.get('code')!)
    ).json()) as { refresh_token: string }
    const t2 = (await (
      await call('/oauth/token', {
        form: {
          grant_type: 'refresh_token',
          client_id: clientId,
          refresh_token: t1.refresh_token,
        },
      })
    ).json()) as { access_token: string; refresh_token: string }
    const replay = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: t1.refresh_token,
      },
    })
    expect(replay.status).toBe(400)
    // the thief's replay killed the honest chain too
    expect(
      await verifyAccessToken(store, t2.access_token, BASE, clock),
    ).toBeNull()
    const next = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: t2.refresh_token,
      },
    })
    expect(next.status).toBe(400)
    expect(store.tokens.size).toBe(0)
  })
  it('a refresh token expires after 30 days, is client-bound and cannot widen scope', async () => {
    const a = await getCode({ scope: 'notes:read' })
    const t = (await (
      await exchange(a.clientId, a.redirect.searchParams.get('code')!)
    ).json()) as { refresh_token: string }
    const widen = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: a.clientId,
        refresh_token: t.refresh_token,
        scope: 'notes:read notes:write',
      },
    })
    expect(widen.status).toBe(400)
    expect(((await widen.json()) as { error: string }).error).toBe(
      'invalid_scope',
    )
    const b = await getCode()
    const tb = (await (
      await exchange(b.clientId, b.redirect.searchParams.get('code')!)
    ).json()) as { refresh_token: string }
    const wrongClient = (await register()).body.client_id as string
    const stolen = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: wrongClient,
        refresh_token: tb.refresh_token,
      },
    })
    expect(stolen.status).toBe(400)
    const c = await getCode()
    const tc = (await (
      await exchange(c.clientId, c.redirect.searchParams.get('code')!)
    ).json()) as { refresh_token: string }
    clock += 31 * 24 * 3600_000
    const old = await call('/oauth/token', {
      form: {
        grant_type: 'refresh_token',
        client_id: c.clientId,
        refresh_token: tc.refresh_token,
      },
    })
    expect(old.status).toBe(400)
  })
  it('revoke cancels the chain and always answers 200', async () => {
    const { clientId, redirect } = await getCode()
    const t = (await (
      await exchange(clientId, redirect.searchParams.get('code')!)
    ).json()) as { access_token: string }
    expect(
      (await call('/oauth/revoke', { form: { token: t.access_token } })).status,
    ).toBe(200)
    expect(
      await verifyAccessToken(store, t.access_token, BASE, clock),
    ).toBeNull()
    expect(
      (await call('/oauth/revoke', { form: { token: 'nothing' } })).status,
    ).toBe(200)
  })
  it('unknown grant types and clients are refused', async () => {
    const { body } = await register()
    const id = body.client_id as string
    expect(
      (
        (await (
          await call('/oauth/token', {
            form: { grant_type: 'password', client_id: id },
          })
        ).json()) as { error: string }
      ).error,
    ).toBe('unsupported_grant_type')
    expect(
      (
        await call('/oauth/token', {
          form: { grant_type: 'authorization_code', client_id: 'nope' },
        })
      ).status,
    ).toBe(401)
  })
  it('revokeUser removes everything a person granted', async () => {
    const { clientId, redirect } = await getCode()
    await exchange(clientId, redirect.searchParams.get('code')!)
    expect(store.tokens.size).toBe(2)
    await store.revokeUser('user-1')
    expect(store.tokens.size).toBe(0)
  })
})

describe('metadata and the 401', () => {
  it('serves both well-known documents', async () => {
    const pr = (await (
      await call('/.well-known/oauth-protected-resource')
    ).json()) as { resource: string; authorization_servers: string[] }
    expect(pr.resource).toBe(BASE)
    expect(pr.authorization_servers).toEqual([BASE])
    const as = (await (
      await call('/.well-known/oauth-authorization-server')
    ).json()) as Record<string, unknown>
    expect(as.code_challenge_methods_supported).toEqual(['S256'])
    expect(as.token_endpoint_auth_methods_supported).toEqual(['none'])
    expect(as.registration_endpoint).toBe(`${BASE}/oauth/register`)
    // the path-inserted form some clients ask for
    expect(
      (await call('/.well-known/oauth-protected-resource/functions/v1/mcp'))
        .status,
    ).toBe(200)
  })
  it('unauthorized() points clients at the metadata', () => {
    const r = unauthorized(BASE)
    expect(r.status).toBe(401)
    expect(r.headers.get('www-authenticate')).toContain(
      `resource_metadata="${BASE}/.well-known/oauth-protected-resource"`,
    )
  })
  it('leaves other addresses to the caller', async () => {
    expect(
      await handleOAuth(new Request(BASE, { method: 'POST' }), deps),
    ).toBeNull()
    expect(
      await handleOAuth(new Request('https://x.example/other'), deps),
    ).toBeNull()
  })
  it('a failing store gives a safe 500, no details', async () => {
    deps.store.getClient = async () => {
      throw new Error('secret internals')
    }
    const res = await call('/oauth/token', {
      form: { grant_type: 'authorization_code', client_id: 'a' },
    })
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('secret')
  })
})

describe('Supabase store requests', () => {
  it('takes a code with one DELETE ... return, and claims a refresh with one conditional PATCH', async () => {
    const seen: { url: string; method: string; prefer?: string }[] = []
    const s = supabaseOAuthStore(
      'https://p.example.test',
      'svc',
      async (url, init) => {
        const i = init as RequestInit & { headers: Record<string, string> }
        seen.push({
          url: String(url),
          method: String(i.method),
          prefer: i.headers.Prefer,
        })
        return new Response('[]', { status: 200 })
      },
    )
    expect(await s.takeCode('abc')).toBeNull()
    expect(await s.claimRefresh('abc', 1)).toBeNull()
    expect(seen[0]).toMatchObject({
      method: 'DELETE',
      prefer: 'return=representation',
    })
    expect(seen[1].method).toBe('PATCH')
    expect(seen[1].url).toContain('used_at=is.null')
    expect(seen[1].url).toContain('kind=eq.refresh')
  })
  it('a store error is thrown, not swallowed', async () => {
    const s = supabaseOAuthStore(
      'https://p.example.test',
      'svc',
      async () => new Response('x', { status: 500 }),
    )
    await expect(s.getClient('a')).rejects.toThrow()
  })
})
