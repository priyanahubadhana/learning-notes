/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writePref } from '../app/uiPrefs'
import { addKey, setKeyCap } from './keyStore'
import { AI_KEYS, callAi, forNotebook, readAiConfig, testKey } from './route'
import { AiError } from './provider'
import { monthKey, othersSpent, readKeyUsage, setOthersUsage } from './usage'

/**
 * Money safety (audit 11 Nov 2026): AI off is off in `callAi` itself, two
 * identical or overlapping calls cannot both slip under the cap, a costly
 * call needs its cost shown first, a timed-out call is not paid twice, and a
 * dropped stream still counts what came.
 */

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

const ok = (text = 'done') =>
  new Response(
    JSON.stringify({
      content: [{ type: 'text', text }],
      usage: { input_tokens: 100, output_tokens: 20 },
    }),
  )

/** A fetch that answers when `release()` is called; counts the calls. */
function gated() {
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => (release = r))
  const calls: string[] = []
  const fn = (async (url: string) => {
    calls.push(url)
    await gate
    return ok()
  }) as unknown as typeof fetch
  return { fn, calls, release: () => release() }
}

function setup() {
  const k = addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')!
  writePref(AI_KEYS.enabled, true)
  return { k, config: readAiConfig() }
}

describe('AI off is off inside callAi', () => {
  it('sends nothing when the switch is off, whatever config a screen holds', async () => {
    const { config } = setup()
    writePref(AI_KEYS.enabled, false)
    const fn = vi.fn()
    // A screen kept an old config that still says on.
    await expect(
      callAi(config, {
        prompt: 'hi',
        maxTokens: 10,
        fetchImpl: fn as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/Turn on AI/)
    expect(fn).not.toHaveBeenCalled()
    await expect(
      callAi(
        { ...config, enabled: false },
        {
          prompt: 'hi',
          maxTokens: 10,
          fetchImpl: fn as unknown as typeof fetch,
        },
      ),
    ).rejects.toThrow()
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('no double spend', () => {
  it('an identical request already running is shared: one network call', async () => {
    const { config } = setup()
    const g = gated()
    const req = { prompt: 'same', maxTokens: 10, fetchImpl: g.fn }
    const a = callAi(config, req)
    const b = callAi(config, req)
    await new Promise((r) => setTimeout(r, 5))
    g.release()
    const [ra, rb] = await Promise.all([a, b])
    expect(ra.text).toBe(rb.text)
    expect(g.calls).toHaveLength(1)
    // It is paid for once, and a later identical request is a new call.
    const once = readKeyUsage(config.candidates[0].keyId).inputTokens
    expect(once).toBe(100)
    await callAi(config, { ...req, fetchImpl: async () => ok() })
    expect(readKeyUsage(config.candidates[0].keyId).inputTokens).toBe(200)
  })

  it('two different calls started together cannot both slip under the cap', async () => {
    const { k, config } = setup()
    // Room for one worst-case call (10 000 output tokens at $0.5/M = $0.005)
    // but not two.
    setKeyCap(k.id, 0.007)
    const g = gated()
    const first = callAi(config, {
      prompt: 'one',
      maxTokens: 10_000,
      fetchImpl: g.fn,
    })
    await expect(
      callAi(config, { prompt: 'two', maxTokens: 10_000, fetchImpl: g.fn }),
    ).rejects.toThrow(/monthly cap/)
    g.release()
    await first
    expect(g.calls).toHaveLength(1)
  })

  it('what the same key spent on other devices counts towards the cap', async () => {
    const { k, config } = setup()
    setKeyCap(k.id, 1)
    setOthersUsage(monthKey(), {
      [k.id]: { inputTokens: 0, outputTokens: 0, costUsd: 0.999 },
    })
    expect(othersSpent(k.id)).toBeCloseTo(0.999)
    const fn = vi.fn()
    await expect(
      callAi(config, {
        prompt: 'hi',
        maxTokens: 10_000,
        fetchImpl: fn as unknown as typeof fetch,
      }),
    ).rejects.toThrow(/monthly cap/)
    expect(fn).not.toHaveBeenCalled()
    // Last month's figure is ignored.
    setOthersUsage('2000-01', {
      [k.id]: { inputTokens: 0, outputTokens: 0, costUsd: 99 },
    })
    expect(othersSpent(k.id)).toBe(0)
  })

  it('the key test is capped and a double tap makes one call', async () => {
    const { k } = setup()
    const g = gated()
    const a = testKey(k.id, g.fn)
    const b = testKey(k.id, g.fn)
    await new Promise((r) => setTimeout(r, 5))
    g.release()
    expect(await a).toEqual({ ok: true })
    expect(await b).toEqual({ ok: true })
    expect(g.calls).toHaveLength(1)
    setKeyCap(k.id, 0)
    const fn = vi.fn()
    const r = await testKey(k.id, fn as unknown as typeof fetch)
    expect(r.ok).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('a costly call needs its cost shown first', () => {
  it('refuses a worst case above the limit unless the screen approved it', async () => {
    const { k } = setup()
    setKeyCap(k.id, 100)
    // The notebook's own choice: only this model, no cheaper stand-in.
    const config = forNotebook(readAiConfig(), {
      aiChoice: { keyId: k.id, model: 'claude-opus-5-5' },
    })
    const big = { prompt: 'x'.repeat(40_000), maxTokens: 10_000 }
    const fn = vi.fn(async () => ok())
    await expect(
      callAi(config, { ...big, fetchImpl: fn as unknown as typeof fetch }),
    ).rejects.toThrow(/could cost about/)
    expect(fn).not.toHaveBeenCalled()
    const r = await callAi(config, {
      ...big,
      approvedUsd: 5,
      fetchImpl: fn as unknown as typeof fetch,
    })
    expect(r.text).toBe('done')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('retries and failures never bill twice', () => {
  it('a timed-out request is counted once and not sent to another model', async () => {
    vi.useFakeTimers()
    const a = addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')!
    addKey('gemini', 'Gemini', 'AIzaCCCCCCCC3333')
    writePref(AI_KEYS.enabled, true)
    const urls: string[] = []
    const hang = ((url: string, init: RequestInit) => {
      urls.push(url)
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('abort')))
      })
    }) as unknown as typeof fetch
    const p = callAi(readAiConfig(), {
      prompt: 'hello world',
      maxTokens: 10,
      fetchImpl: hang,
    })
    const caught = p.catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(91_000)
    const e = await caught
    expect(e).toBeInstanceOf(AiError)
    expect((e as AiError).maybeBilled).toBe(true)
    expect(urls).toHaveLength(1)
    // The words sent are counted, since their side may have billed them.
    expect(readKeyUsage(a.id).inputTokens).toBeGreaterThan(0)
  })

  it('a retry after a busy answer is one recorded call', async () => {
    const { k, config } = setup()
    let n = 0
    const fn = (async () => {
      n += 1
      return n === 1 ? new Response('{}', { status: 529 }) : ok()
    }) as unknown as typeof fetch
    await callAi(config, {
      prompt: 'retry me',
      maxTokens: 10,
      fetchImpl: fn,
      sleep: async () => {},
    })
    expect(n).toBe(2)
    expect(readKeyUsage(k.id).inputTokens).toBe(100)
  })

  it('a stream that drops after some words keeps them and counts them', async () => {
    const { k, config } = setup()
    const enc = new TextEncoder()
    let sent = false
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        // First read: some words; second read: the connection drops.
        if (sent) return c.error(new Error('connection lost'))
        sent = true
        c.enqueue(
          enc.encode(
            'data: {"type":"message_start","message":{"usage":{"input_tokens":50}}}\n' +
              'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n',
          ),
        )
      },
    })
    const fn = (async () =>
      new Response(body, { status: 200 })) as unknown as typeof fetch
    const pieces: string[] = []
    const r = await callAi(config, {
      prompt: 'stream me',
      maxTokens: 100,
      fetchImpl: fn,
      onText: (p) => pieces.push(p),
    })
    expect(r.text).toBe('Hello')
    expect(r.stopped).toBe(true)
    expect(readKeyUsage(k.id).inputTokens).toBe(50)
  })
})

describe('a shared key is capped as one key across devices', () => {
  it("another device's usage record is added to the cap check, and ours goes out", async () => {
    const { createTestDb } = await import('../core/testing')
    const { stableId } = await import('../core/ids')
    const { newRecordFields } = await import('../core/records')
    const { setKeySync, stopKeySync, startKeySync } = await import('./keySync')
    const { getDeviceId } = await import('../sync/device')
    const { recordUsage } = await import('./usage')
    const db = createTestDb()
    const { k } = setup()
    await setKeySync(db, true)
    // Another phone spent $0.50 on this key this month.
    await db.secrets.put({
      ...newRecordFields(),
      id: stableId('secret:aiUsage:other-phone'),
      kind: 'aiUsage',
      value: {
        month: monthKey(),
        keys: { [k.id]: { inputTokens: 1, outputTokens: 1, costUsd: 0.5 } },
      },
      updatedAt: Date.now(),
      deletedAt: null,
    })
    await new Promise((r) => setTimeout(r, 60))
    expect(othersSpent(k.id)).toBeCloseTo(0.5)
    // This device's own use is written under its own id.
    recordUsage(k.id, 'anthropic', 'claude-haiku-5-5', 1000, 1000)
    await new Promise((r) => setTimeout(r, 60))
    const mine = await db.secrets.get(
      stableId(`secret:aiUsage:${getDeviceId()}`),
    )
    expect(mine?.kind).toBe('aiUsage')
    expect(JSON.stringify(mine?.value)).not.toContain('sk-ant')
    stopKeySync(db)
    startKeySync(db)
    stopKeySync(db)
  })
})
