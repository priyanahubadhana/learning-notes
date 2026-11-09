import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  handle,
  lockToken,
  unlockToken,
  type Env,
} from '../../../supabase/functions/_shared/driveTokenHandler'
import { revokeServerToken, serverPass, storeRefreshToken } from './driveServer'
import { authorizeUrl, supabaseAuth } from './supabase'

const g = globalThis as Record<string, unknown>
const reply = (status: number, body: object = {}) =>
  new Response([204, 205].includes(status) ? null : JSON.stringify(body), {
    status,
  })

describe('client: the Drive pass keeper answers', () => {
  let saved: unknown
  beforeEach(() => {
    saved = g.fetch
  })
  afterEach(() => {
    g.fetch = saved
  })

  it('a fresh pass comes back with a minute of slack', async () => {
    g.fetch = async () => reply(200, { access_token: 'A', expires_in: 3600 })
    const r = await serverPass('jwt')
    expect(r.kind).toBe('ok')
    if (r.kind === 'ok') {
      expect(r.token).toBe('A')
      expect(r.expiresAt).toBeGreaterThan(Date.now() + 58 * 60_000)
    }
  })

  it('maps every refusal to one word', async () => {
    const ask = async (status: number, body: object = {}) => {
      g.fetch = async () => reply(status, body)
      return (await serverPass('jwt')).kind
    }
    expect(await ask(404, { error: 'none' })).toBe('none')
    expect(await ask(404, {})).toBe('unavailable') // function not deployed
    expect(await ask(503, { error: 'not set up' })).toBe('unavailable')
    expect(await ask(409, { error: 'revoked' })).toBe('revoked')
    expect(await ask(502)).toBe('error')
    g.fetch = async () => {
      throw new TypeError('offline')
    }
    expect((await serverPass('jwt')).kind).toBe('error')
  })

  it('store and revoke send the sign-in token and never throw', async () => {
    const seen: { auth: string; body: string }[] = []
    g.fetch = async (_u: string, init: RequestInit) => {
      seen.push({
        auth: (init.headers as Record<string, string>).Authorization,
        body: String(init.body),
      })
      return reply(200, { ok: true })
    }
    expect(await storeRefreshToken('jwt', 'R')).toBe(true)
    await revokeServerToken('jwt')
    expect(seen.map((s) => s.auth)).toEqual(['Bearer jwt', 'Bearer jwt'])
    expect(JSON.parse(seen[0].body)).toEqual({
      action: 'store',
      refresh_token: 'R',
    })
    expect(JSON.parse(seen[1].body)).toEqual({ action: 'revoke' })
    g.fetch = async () => {
      throw new TypeError('offline')
    }
    expect(await storeRefreshToken('jwt', 'R')).toBe(false)
    await expect(revokeServerToken('jwt')).resolves.toBeUndefined()
  })
})

describe('sign-in address', () => {
  it('asks for offline access; consent only when told', () => {
    const a = authorizeUrl('https://app.test/', 'c')
    const b = authorizeUrl('https://app.test/', 'c', true)
    expect(a.searchParams.get('access_type')).toBe('offline')
    expect(a.searchParams.get('prompt')).toBe('select_account')
    expect(b.searchParams.get('prompt')).toBe('select_account consent')
  })
})

describe('the app asks the server first (mocked endpoints)', () => {
  let saved: Record<string, unknown>
  let mem: Map<string, string>
  let assigned: string[]
  beforeEach(() => {
    saved = {
      fetch: g.fetch,
      localStorage: g.localStorage,
      sessionStorage: g.sessionStorage,
      location: g.location,
      document: g.document,
    }
    mem = new Map([
      [
        'learning-notes:sync.session',
        JSON.stringify({
          access: 'jwt',
          refresh: 'r',
          expiresAt: Date.now() + 30 * 60_000,
          account: { accountId: 'u', email: 'a@b.c', sub: 's' },
        }),
      ],
      ['learning-notes:sync.driveOffline', '1'],
    ])
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
      removeItem: (k: string) => mem.delete(k),
    }
    g.localStorage = store
    g.sessionStorage = store
    assigned = []
    g.location = {
      href: 'https://app.test/',
      assign: (u: string) => assigned.push(u),
    }
    g.document = undefined // the old Google window is unavailable here
  })
  afterEach(() => Object.assign(g, saved))

  it('renews through the server: no Google window, no Reconnect bar', async () => {
    let n = 0
    g.fetch = async () =>
      reply(200, { access_token: `T${++n}`, expires_in: 3600 })
    const auth = supabaseAuth()
    expect(await auth.driveToken(false)).toBe('T1')
    auth.dropDriveToken?.() // a Drive 401: the next call renews again
    expect(await auth.driveToken(false)).toBe('T2')
  })

  it('revoked: quiet gives null (the one calm bar), the tap signs in with consent', async () => {
    g.fetch = async () => reply(409, { error: 'revoked' })
    const auth = supabaseAuth()
    expect(await auth.driveToken(false)).toBeNull()
    expect(mem.has('learning-notes:sync.driveOffline')).toBe(false)
    expect(assigned).toEqual([])
    expect(await auth.driveToken(true)).toBeNull()
    await new Promise((r) => setTimeout(r, 20))
    expect(assigned).toHaveLength(1)
    expect(new URL(assigned[0]).searchParams.get('prompt')).toBe(
      'select_account consent',
    )
  })

  it('offline: null now, asks again next time', async () => {
    g.fetch = async () => {
      throw new TypeError('offline')
    }
    expect(await supabaseAuth().driveToken(false)).toBeNull()
  })
})

describe('server function (mocked Supabase and Google)', () => {
  const env: Env = {
    SUPABASE_URL: 'https://x.test',
    SUPABASE_SERVICE_ROLE_KEY: 'svc',
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'sec',
    DRIVE_TOKEN_KEY: 'lock-key',
    ALLOWED_EMAIL: 'me@x.com',
  }
  const ask = (
    action: string,
    f: typeof fetch,
    extra: object = {},
    auth: string | null = 'Bearer jwt',
    e: Env = env,
  ) =>
    handle(
      new Request('https://f.test/', {
        method: 'POST',
        headers: auth ? { Authorization: auth } : {},
        body: JSON.stringify({ action, ...extra }),
      }),
      e,
      f,
    )
  /** A tiny fake world: the user check, the table and Google. */
  function world(opts: { email?: string; google?: Response } = {}) {
    const rows = new Map<string, string>()
    const log: string[] = []
    const f = (async (url: string, init: RequestInit = {}) => {
      const u = String(url)
      log.push(`${init.method ?? 'GET'} ${u}`)
      if (u.endsWith('/auth/v1/user'))
        return reply(200, { id: 'U1', email: opts.email ?? 'me@x.com' })
      if (u.includes('/rest/v1/drive_tokens')) {
        if (init.method === 'POST') {
          const b = JSON.parse(String(init.body))
          rows.set(b.account_id, b.data)
          return reply(201)
        }
        if (init.method === 'DELETE') {
          rows.delete('U1')
          return reply(204)
        }
        return reply(200, rows.has('U1') ? [{ data: rows.get('U1') }] : [])
      }
      if (u.endsWith('/token'))
        return (
          opts.google ?? reply(200, { access_token: 'G', expires_in: 3599 })
        )
      if (u.endsWith('/revoke')) return reply(200)
      return reply(500)
    }) as typeof fetch
    return { f, rows, log }
  }

  it('locks a token so only that account can open it', async () => {
    const locked = await lockToken('k', 'U1', 'refresh-secret')
    expect(locked).not.toContain('refresh-secret')
    expect(await unlockToken('k', 'U1', locked)).toBe('refresh-secret')
    await expect(unlockToken('k', 'U2', locked)).rejects.toThrow()
    await expect(unlockToken('other', 'U1', locked)).rejects.toThrow()
  })

  it('store then token: the refresh token is locked in the table and trades for a pass', async () => {
    const w = world()
    expect((await ask('store', w.f, { refresh_token: 'RT' })).status).toBe(200)
    expect(w.rows.get('U1')).not.toContain('RT')
    const r = await ask('token', w.f)
    expect(await r.json()).toEqual({ access_token: 'G', expires_in: 3599 })
  })

  it('no stored token = 404 none', async () => {
    const r = await ask('token', world().f)
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ error: 'none' })
  })

  it('Google says invalid_grant: 409 revoked and the row is deleted', async () => {
    const w = world({ google: reply(400, { error: 'invalid_grant' }) })
    await ask('store', w.f, { refresh_token: 'RT' })
    const r = await ask('token', w.f)
    expect(r.status).toBe(409)
    expect(w.rows.size).toBe(0)
  })

  it('a Google hiccup keeps the row (502)', async () => {
    const w = world({ google: reply(500) })
    await ask('store', w.f, { refresh_token: 'RT' })
    expect((await ask('token', w.f)).status).toBe(502)
    expect(w.rows.size).toBe(1)
  })

  it('revoke tells Google and deletes the row', async () => {
    const w = world()
    await ask('store', w.f, { refresh_token: 'RT' })
    expect((await ask('revoke', w.f)).status).toBe(200)
    expect(w.rows.size).toBe(0)
    expect(w.log.some((l) => l.endsWith('/revoke'))).toBe(true)
  })

  it('refuses strangers, other accounts and missing secrets', async () => {
    const w = world()
    expect((await ask('token', w.f, {}, null)).status).toBe(401)
    expect((await ask('token', world({ email: 'x@y.z' }).f)).status).toBe(403)
    expect(
      (
        await ask('token', w.f, {}, 'Bearer jwt', {
          ...env,
          GOOGLE_CLIENT_SECRET: '',
        })
      ).status,
    ).toBe(503)
    expect((await ask('nope', w.f)).status).toBe(400)
  })
})
