import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ALLOWED_EMAIL } from './config'
import { sessionEnded } from './sessionEnd'
import { supabaseAuth } from './supabase'

const g = globalThis as Record<string, unknown>
const reply = (status: number, body: object = {}) =>
  new Response(JSON.stringify(body), { status })

describe('remote sign-out: telling it from a normal expiry', () => {
  it('only a refused renewal (400/401/403/404) means the session was ended', () => {
    for (const s of [400, 401, 403, 404]) expect(sessionEnded(s)).toBe(true)
    for (const s of [200, 408, 429, 500, 503])
      expect(sessionEnded(s)).toBe(false)
  })

  describe('with the sign-in client (mocked endpoints)', () => {
    let saved: Record<string, unknown>
    let mem2: Map<string, string>
    const SESSION = 'learning-notes:sync.session'
    const seed = () =>
      mem2.set(
        SESSION,
        JSON.stringify({
          access: 'old',
          refresh: 'r',
          expiresAt: Date.now() - 1000, // the access token ran out
          account: { accountId: 'u', email: 'a@b.c', sub: 's' },
        }),
      )
    beforeEach(() => {
      saved = {
        fetch: g.fetch,
        localStorage: g.localStorage,
        sessionStorage: g.sessionStorage,
      }
      mem2 = new Map()
      const store = {
        getItem: (k: string) => mem2.get(k) ?? null,
        setItem: (k: string, v: string) => mem2.set(k, v),
        removeItem: (k: string) => mem2.delete(k),
      }
      g.localStorage = store
      g.sessionStorage = store
      seed()
    })
    afterEach(() => Object.assign(g, saved))

    const run = async (fetcher: () => Promise<Response>) => {
      g.fetch = fetcher
      const auth = supabaseAuth()
      let ended = 0
      auth.onSessionEnded?.(() => ended++)
      const result = await auth.accessToken().then(
        (t) => t,
        (e: Error) => e.message,
      )
      return { ended, result }
    }

    it('a normal expiry renews quietly: not a sign-out', async () => {
      const r = await run(async () =>
        reply(200, {
          access_token: 'new',
          refresh_token: 'r2',
          expires_in: 3600,
          user: { id: 'u', email: ALLOWED_EMAIL },
        }),
      )
      expect(r).toEqual({ ended: 0, result: 'new' })
    })

    it('the server refusing the renewal as invalid is a remote sign-out', async () => {
      const r = await run(async () =>
        reply(400, { error_code: 'refresh_token_not_found' }),
      )
      expect(r).toEqual({ ended: 1, result: 'session ended' })
      expect(mem2.has(SESSION)).toBe(false)
    })

    it('offline or a busy server is not a sign-out and keeps the session', async () => {
      for (const f of [
        async () => {
          throw new TypeError('offline')
        },
        async () => reply(503),
        async () => reply(429),
      ]) {
        const r = await run(f)
        expect(r.ended).toBe(0)
        expect(mem2.has(SESSION)).toBe(true)
      }
    })

    it('the person signing out on purpose is never a remote sign-out', async () => {
      g.fetch = async () => reply(400, { error_code: 'session_not_found' })
      const auth = supabaseAuth()
      let ended = 0
      auth.onSessionEnded?.(() => ended++)
      await auth.signOut()
      expect(ended).toBe(0)
    })
  })
})
