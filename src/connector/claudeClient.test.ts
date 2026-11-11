import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  claudeDisable,
  claudeEnable,
  claudeSetNotebooks,
  claudeStatus,
  connectedApps,
  revokeApp,
} from '../sync/connectors/claudeServer'
import { modeOf, sameChoice, scopeToSend } from './claudeChoice'

type Call = { url: string; init: RequestInit }
let calls: Call[] = []
function mockFetch(status: number, body: unknown = {}) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(body), { status })
    }),
  )
}
afterEach(() => vi.unstubAllGlobals())

describe('Claude settings: server calls', () => {
  it('reads the status with the sign-in token', async () => {
    mockFetch(200, { available: true, on: false })
    const r = await claudeStatus('tok')
    expect(r).toEqual({ ok: true, value: { available: true, on: false } })
    expect(calls[0].url).toMatch(/\/functions\/v1\/mcp\/escrow$/)
    expect(calls[0].init.method).toBe('GET')
    const h = calls[0].init.headers as Record<string, string>
    expect(h.Authorization).toBe('Bearer tok')
  })

  it('sends the key once as base64 and wipes the bytes afterwards', async () => {
    mockFetch(200, { ok: true })
    const raw = new Uint8Array(32).fill(7)
    const r = await claudeEnable('tok', { keyId: '0123456789abcdef', raw }, [
      'n1',
    ])
    expect(r.ok).toBe(true)
    const sent = JSON.parse(calls[0].init.body as string)
    expect(sent).toEqual({
      keyId: '0123456789abcdef',
      key: Buffer.from(new Uint8Array(32).fill(7)).toString('base64'),
      notebookIds: ['n1'],
    })
    expect(calls[0].init.method).toBe('POST')
    expect([...raw].every((b) => b === 0)).toBe(true)
  })

  it('wipes the bytes even when the server cannot be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    const raw = new Uint8Array(32).fill(9)
    const r = await claudeEnable(
      'tok',
      { keyId: '0123456789abcdef', raw },
      null,
    )
    expect(r).toEqual({ ok: false, reason: 'error' })
    expect([...raw].every((b) => b === 0)).toBe(true)
  })

  it('maps answers to plain reasons and never throws', async () => {
    mockFetch(401)
    expect(await claudeStatus('x')).toEqual({ ok: false, reason: 'login' })
    mockFetch(503)
    expect(await claudeStatus('x')).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    mockFetch(400, { error: 'wrong_key' })
    expect(await claudeStatus('x')).toEqual({ ok: false, reason: 'wrongKey' })
    mockFetch(400, { error: 'bad_request' })
    expect(await claudeStatus('x')).toEqual({ ok: false, reason: 'bad' })
    mockFetch(500)
    expect(await claudeStatus('x')).toEqual({ ok: false, reason: 'error' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    )
    expect(await claudeStatus('x')).toEqual({ ok: false, reason: 'error' })
  })

  it('uses the right method and address for each action', async () => {
    mockFetch(200, { ok: true, apps: [] })
    await claudeSetNotebooks('t', null)
    await claudeDisable('t')
    await connectedApps('t')
    await revokeApp('t', 'fam1')
    expect(
      calls.map((c) => `${c.init.method} ${c.url.split('/mcp')[1]}`),
    ).toEqual([
      'PUT /escrow',
      'DELETE /escrow',
      'GET /connections',
      'POST /connections/revoke',
    ])
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      notebookIds: null,
    })
    expect(JSON.parse(calls[3].init.body as string)).toEqual({ family: 'fam1' })
  })
})

describe('Claude settings: notebook choice', () => {
  const existing = ['a', 'b', 'c']
  it('"all" sends null; "some" sends the ticked notebooks that still exist', () => {
    expect(scopeToSend('all', new Set(['a']), existing)).toBeNull()
    expect(scopeToSend('some', new Set(['b', 'gone']), existing)).toEqual(['b'])
  })
  it('"some" with nothing ticked (or only deleted notebooks) is not valid', () => {
    expect(scopeToSend('some', new Set(), existing)).toBeUndefined()
    expect(scopeToSend('some', new Set(['gone']), existing)).toBeUndefined()
  })
  it('knows the mode of what the server holds and whether a save is needed', () => {
    expect(modeOf(null)).toBe('all')
    expect(modeOf(['a'])).toBe('some')
    expect(sameChoice(null, null)).toBe(true)
    expect(sameChoice(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameChoice(['a'], ['a', 'b'])).toBe(false)
    expect(sameChoice(null, ['a'])).toBe(false)
    expect(sameChoice(undefined, null)).toBe(false)
  })
})
