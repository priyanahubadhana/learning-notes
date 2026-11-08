import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../../core/testing'
import { createMasterKey } from '../crypto'
import { setTracking } from '../device'
import { enqueueChanged, syncOnce } from '../engine'
import { createDrivePass, RENEW_AHEAD_MS, type Pass } from './drivePass'
import { driveFiles, renewDriveToken } from './google'
import { memoryConnectors } from './memory'
import { NeedsTapError, type AuthProvider } from './types'

const MIN = 60_000

function setup(start?: Pass) {
  let clock = 1_000_000
  let pass = start
  const calls: boolean[] = []
  let answer: (interactive: boolean) => Pass | null = () => null
  const p = createDrivePass({
    get: () => pass,
    set: (v) => (pass = v),
    renew: async (i) => {
      calls.push(i)
      return answer(i)
    },
    now: () => clock,
  })
  return {
    p,
    calls,
    tick: (ms: number) => (clock += ms),
    now: () => clock,
    stored: () => pass,
    answer: (f: (i: boolean) => Pass | null) => (answer = f),
  }
}

describe('Drive pass lifecycle (fix #4)', () => {
  it('uses a pass that is not near its end without asking Google', async () => {
    const s = setup({ token: 'a', expiresAt: 1_000_000 + 30 * MIN })
    expect(await s.p.token(false)).toBe('a')
    expect(s.calls).toEqual([])
  })

  it('renews quietly a few minutes BEFORE the pass ends', async () => {
    const s = setup({ token: 'a', expiresAt: 1_000_000 + 30 * MIN })
    s.answer(() => ({ token: 'b', expiresAt: s.now() + 59 * MIN }))
    s.tick(30 * MIN - RENEW_AHEAD_MS + 1)
    expect(await s.p.token(false)).toBe('b')
    expect(s.calls).toEqual([false])
    expect(s.stored()?.token).toBe('b')
  })

  it('renews when there is no pass at all (start-up)', async () => {
    const s = setup(undefined)
    s.answer(() => ({ token: 'n', expiresAt: s.now() + 59 * MIN }))
    expect(await s.p.token(false)).toBe('n')
  })

  it('several callers share one renewal', async () => {
    const s = setup(undefined)
    s.answer(() => ({ token: 'n', expiresAt: s.now() + 59 * MIN }))
    const r = await Promise.all([
      s.p.token(false),
      s.p.token(false),
      s.p.token(false),
    ])
    expect(r).toEqual(['n', 'n', 'n'])
    expect(s.calls).toHaveLength(1)
  })

  it('a refused quiet renewal keeps a pass that still works', async () => {
    const s = setup({ token: 'a', expiresAt: 1_000_000 + 30 * MIN })
    s.tick(27 * MIN) // 3 min left: inside the renew window
    expect(await s.p.token(false)).toBe('a')
    s.tick(4 * MIN) // ended
    expect(await s.p.token(false)).toBeNull()
  })

  it('interaction required: quiet gives null, a tap gets the pass', async () => {
    const s = setup(undefined)
    s.answer((interactive) =>
      interactive ? { token: 't', expiresAt: s.now() + 59 * MIN } : null,
    )
    expect(await s.p.token(false)).toBeNull()
    expect(await s.p.token(true)).toBe('t')
    expect(s.calls).toEqual([false, true])
    expect(await s.p.token(false)).toBe('t') // no more windows
    expect(s.calls).toHaveLength(2)
  })

  it('drop() forgets a refused pass so the next call renews', async () => {
    const s = setup({ token: 'a', expiresAt: 1_000_000 + 50 * MIN })
    s.answer(() => ({ token: 'b', expiresAt: s.now() + 59 * MIN }))
    s.p.drop()
    expect(await s.p.token(false)).toBe('b')
  })
})

describe('Drive calls with a fake Google script', () => {
  const g = globalThis as Record<string, unknown>
  let saved: Record<string, unknown>
  beforeEach(() => {
    saved = {
      document: g.document,
      google: g.google,
      localStorage: g.localStorage,
      fetch: g.fetch,
    }
    const mem = new Map<string, string>([
      ['learning-notes:sync.driveFolder', 'F'],
    ])
    g.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => mem.set(k, v),
    }
    g.document = {
      createElement: () => ({}),
      head: {
        append: (s: { onload?: () => void }) =>
          queueMicrotask(() => s.onload?.()),
      },
    }
  })
  afterEach(() => {
    Object.assign(g, saved)
  })

  const fakeGoogle = (reply: (prompt?: string) => object | 'error') => {
    const seen: (string | undefined)[] = []
    g.google = {
      accounts: {
        oauth2: {
          initTokenClient: (o: {
            prompt?: string
            callback: (r: object) => void
            error_callback?: (e: { type: string }) => void
          }) => ({
            requestAccessToken: () => {
              seen.push(o.prompt)
              const r = reply(o.prompt)
              if (r === 'error')
                o.error_callback?.({ type: 'popup_failed_to_open' })
              else o.callback(r)
            },
          }),
        },
      },
    }
    return seen
  }

  it('quiet renewal asks with prompt none, a tap with an empty prompt', async () => {
    const seen = fakeGoogle(() => ({ access_token: 'x', expires_in: 3600 }))
    const a = await renewDriveToken('me@x.com', false)
    const b = await renewDriveToken('me@x.com', true)
    expect(seen).toEqual(['none', ''])
    expect(a!.expiresAt).toBeGreaterThan(Date.now() + 58 * MIN)
    expect(b!.token).toBe('x')
  })

  it('a blocked window or a refusal gives null (never hangs, never throws)', async () => {
    fakeGoogle(() => 'error')
    expect(await renewDriveToken('me@x.com', false)).toBeNull()
    fakeGoogle(() => ({ error: 'interaction_required' }))
    expect(await renewDriveToken('me@x.com', false)).toBeNull()
  })

  it('a 401 renews the pass and sends the request again once', async () => {
    let n = 0
    const sent: string[] = []
    g.fetch = async (_u: string, init: RequestInit) => {
      sent.push((init.headers as Record<string, string>).Authorization)
      return sent.length === 1
        ? new Response('', { status: 401 })
        : new Response(JSON.stringify({ files: [] }), { status: 200 })
    }
    let token = 'old'
    const auth = {
      driveToken: async () => token,
      dropDriveToken: () => {
        n++
        token = 'new'
      },
    } as unknown as AuthProvider
    await driveFiles(auth).list('ln-')
    expect(sent).toEqual(['Bearer old', 'Bearer new'])
    expect(n).toBe(1)
  })

  it('two 401s in a row ask for one tap (NeedsTapError)', async () => {
    g.fetch = async () => new Response('', { status: 401 })
    const auth = {
      driveToken: async () => 't',
      dropDriveToken: () => undefined,
    } as unknown as AuthProvider
    await expect(driveFiles(auth).list('ln-')).rejects.toBeInstanceOf(
      NeedsTapError,
    )
  })

  it('no pass: one tap needed, not a silent failure', async () => {
    g.fetch = async () => new Response('{}', { status: 200 })
    const auth = { driveToken: async () => null } as unknown as AuthProvider
    await expect(driveFiles(auth).list('ln-')).rejects.toBeInstanceOf(
      NeedsTapError,
    )
  })
})

describe('queued picture uploads resume after renewal', () => {
  it('waits while Drive needs a tap, then sends', async () => {
    setTracking(true)
    const master = await createMasterKey()
    const a = createTestDb()
    const conn = memoryConnectors()
    const realPut = conn.files.put
    let blocked = true
    conn.files.put = async (n, b) => {
      if (blocked) throw new NeedsTapError('drive')
      return realPut(n, b)
    }
    const id = crypto.randomUUID()
    const now = Date.now()
    await a.images.add({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: 'c.png',
      type: 'image/png',
      width: 1,
      height: 1,
      data: new Uint8Array([1, 2, 3]).buffer,
    })
    await enqueueChanged(a)
    const r1 = await syncOnce(a, conn, master)
    expect(r1.needsDriveTap).toBe(true)
    expect(r1.filesUp).toBe(0)
    blocked = false
    const r2 = await syncOnce(a, conn, master)
    expect(r2.filesUp).toBe(1)
    expect(Object.keys(conn.state.files)).toHaveLength(1)
    setTracking(false)
  })
})
