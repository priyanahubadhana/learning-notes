import { describe, expect, it } from 'vitest'
import { ALLOWED_EMAIL } from '../../src/sync/connectors/config'
import {
  AuthError,
  GOOGLE_REDIRECT,
  googleAuthorizeUrl,
  makePkce,
  saveSession,
  sessionKeeper,
  toSession,
} from '../src/auth'
import {
  forgetAll,
  loadMaster,
  passphraseBundle,
  unlockAndStore,
} from '../src/keys'
import { memoryStore } from '../src/secrets'
import {
  bundleWithPassphrase,
  bundleWithRecovery,
  createMasterKey,
  newRecoveryCode,
  openRecord,
  remoteId,
  sealRecord,
} from '../../src/sync/crypto'

const reply = (email: string, n = 1) => ({
  access_token: `access${n}`,
  refresh_token: `refresh${n}`,
  expires_in: 3600,
  user: { id: 'acc', email },
})

describe('sign-in', () => {
  it('accepts only the owner account', () => {
    expect(toSession(reply(ALLOWED_EMAIL)).email).toBe(ALLOWED_EMAIL)
    expect(() => toSession(reply('someone@else.com'))).toThrow(AuthError)
  })

  it('builds a Google address with PKCE and the local return address', () => {
    const { challenge, verifier } = makePkce()
    expect(verifier.length).toBeGreaterThan(40)
    const u = new URL(googleAuthorizeUrl(challenge))
    expect(u.searchParams.get('provider')).toBe('google')
    expect(u.searchParams.get('redirect_to')).toBe(GOOGLE_REDIRECT)
    expect(u.searchParams.get('code_challenge')).toBe(challenge)
    expect(GOOGLE_REDIRECT.startsWith('http://127.0.0.1:')).toBe(true)
  })

  it('renews the access token and keeps the new single-use refresh token', async () => {
    const store = memoryStore()
    await saveSession(store, toSession(reply(ALLOWED_EMAIL, 0)))
    const sent: string[] = []
    let n = 0
    const f = (async (_url: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string).refresh_token)
      n++
      return new Response(JSON.stringify(reply(ALLOWED_EMAIL, n)), {
        status: 200,
      })
    }) as unknown as typeof fetch
    let clock = 0
    const keeper = sessionKeeper(store, f, () => clock)
    expect(await keeper.accessToken()).toBe('access1')
    expect(await keeper.accessToken()).toBe('access1') // still fresh: no new call
    clock = 3_600_000 // an hour later
    expect(await keeper.accessToken()).toBe('access2')
    expect(sent).toEqual(['refresh0', 'refresh1'])
    expect(JSON.parse((await store.get('refresh'))!).refresh).toBe('refresh2')
  })

  it('joins simultaneous renewals into one call', async () => {
    const store = memoryStore()
    await saveSession(store, toSession(reply(ALLOWED_EMAIL, 0)))
    let calls = 0
    const f = (async () => {
      calls++
      return new Response(JSON.stringify(reply(ALLOWED_EMAIL, calls)), {
        status: 200,
      })
    }) as unknown as typeof fetch
    const keeper = sessionKeeper(store, f, () => 0)
    await Promise.all([
      keeper.accessToken(),
      keeper.accessToken(),
      keeper.accessToken(),
    ])
    expect(calls).toBe(1)
  })

  it('says to run setup when signed out or revoked', async () => {
    const empty = sessionKeeper(memoryStore())
    await expect(empty.accessToken()).rejects.toThrow(/setup/)
    const store = memoryStore()
    await saveSession(store, toSession(reply(ALLOWED_EMAIL, 0)))
    const f = (async () =>
      new Response('{}', { status: 400 })) as unknown as typeof fetch
    await expect(sessionKeeper(store, f).accessToken()).rejects.toThrow(/setup/)
  })
})

describe('key handling', () => {
  const FAST = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 }

  it('unlocks the passphrase bundle, keeps the key, and reloads it for decrypting', async () => {
    const master = await createMasterKey()
    const pass = await bundleWithPassphrase(
      master,
      'correct horse battery',
      FAST,
    )
    const rec = await bundleWithRecovery(master, newRecoveryCode())
    const bundle = passphraseBundle([
      JSON.stringify(rec),
      'not json',
      JSON.stringify(pass),
    ])
    expect(bundle?.method).toBe('passphrase')

    const store = memoryStore()
    await unlockAndStore(store, bundle!, 'correct horse battery')
    const loaded = (await loadMaster(store))!
    expect(loaded.keyId).toBe(master.keyId)
    expect(loaded.raw).toBeUndefined() // raw bytes are not kept in memory
    const sealed = await sealRecord(master, 'pages', 'p', 1, { ok: 1 })
    expect(
      (await openRecord(loaded, remoteId('pages', 'p'), 1, sealed)).value,
    ).toEqual({ ok: 1 })

    await forgetAll(store)
    expect(await loadMaster(store)).toBeNull()
  })

  it('a wrong passphrase stores nothing', async () => {
    const master = await createMasterKey()
    const pass = await bundleWithPassphrase(
      master,
      'correct horse battery',
      FAST,
    )
    const store = memoryStore()
    await expect(
      unlockAndStore(store, pass, 'wrong wrong wrong'),
    ).rejects.toThrow()
    expect(await loadMaster(store)).toBeNull()
  })
})
