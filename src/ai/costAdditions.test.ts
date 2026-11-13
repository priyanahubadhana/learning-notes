/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writePref } from '../app/uiPrefs'
import { addKey, listKeys, setKeyCap } from './keyStore'
import { AI_KEYS, readAiConfig } from './route'
import { complete } from './providers'
import { countPromptTokens } from './countTokens'
import { readSendLog } from './sendLog'
import { costOf, worstCost } from './usage'

/**
 * AI cost additions (docs/features/ai.md, "Cost additions"): the cache
 * storage charge is never left out of the cost, and the preview asks the
 * provider for the true token count under every rule of a real call.
 */

beforeEach(() => localStorage.clear())

const setup = () => {
  addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')
  writePref(AI_KEYS.enabled, true)
  return readAiConfig()
}
const json = (o: unknown) => new Response(JSON.stringify(o))

describe('prompt caching cost (CA-1)', () => {
  it('prices tokens written to the cache above plain input', () => {
    const plain = costOf('anthropic', 'claude-haiku-5-5', 10_000, 0)
    const written = costOf(
      'anthropic',
      'claude-haiku-5-5',
      10_000,
      0,
      0,
      10_000,
    )
    expect(written).toBeCloseTo(plain * 1.25, 10)
  })
  it('a cached read alone never beats the real cost of the write before it', () => {
    const first = costOf('anthropic', 'claude-haiku-5-5', 10_000, 0, 0, 10_000)
    const again = costOf('anthropic', 'claude-haiku-5-5', 10_000, 0, 10_000)
    expect(first).toBeGreaterThan(again)
  })
  it('the worst case includes the storage charge of a cached prefix', () => {
    const base = worstCost(
      'anthropic',
      'claude-haiku-5-5',
      'x'.repeat(4000),
      100,
    )
    const withPrefix = worstCost(
      'anthropic',
      'claude-haiku-5-5',
      'x'.repeat(4000),
      100,
      [],
      'y'.repeat(4000),
    )
    expect(withPrefix).toBeGreaterThan(base)
  })
  it('reports cache writes from Claude and costs them', async () => {
    const fn = vi.fn(async () =>
      json({
        content: [{ type: 'text', text: 'ok' }],
        usage: {
          input_tokens: 10,
          output_tokens: 1,
          cache_creation_input_tokens: 500,
          cache_read_input_tokens: 0,
        },
      }),
    ) as unknown as typeof fetch
    const r = await complete({
      provider: 'anthropic',
      key: 'k',
      model: 'claude-haiku-5-5',
      prompt: 'q',
      cachePrefix: 'long text',
      maxTokens: 10,
      fetchImpl: fn,
    })
    expect(r.cacheWriteTokens).toBe(500)
    expect(r.inputTokens).toBe(510)
  })
  it('a provider without caching works as before', async () => {
    const fn = vi.fn(async () =>
      json({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 7, completion_tokens: 2 },
      }),
    ) as unknown as typeof fetch
    const r = await complete({
      provider: 'openai',
      key: 'k',
      model: 'gpt-4o-mini',
      prompt: 'q',
      maxTokens: 10,
      fetchImpl: fn,
    })
    expect(r.cacheWriteTokens ?? 0).toBe(0)
    expect(r.inputTokens).toBe(7)
  })
})

describe('true token count (CA-2 to CA-6)', () => {
  const base = { text: 'a'.repeat(400), notebookId: 'n1', allowedHere: true }

  it('uses the provider count and says it is not estimated', async () => {
    const config = setup()
    const fn = vi.fn(async () =>
      json({ input_tokens: 77 }),
    ) as unknown as typeof fetch
    const r = await countPromptTokens(config, { ...base, fetchImpl: fn })
    expect(r).toEqual({ tokens: 77, estimated: false })
    const [url] = (fn as unknown as { mock: { calls: string[][] } }).mock
      .calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages/count_tokens')
  })
  it('falls back to 4 characters a token, marked estimated, when the call fails', async () => {
    const config = setup()
    const fn = vi.fn(
      async () => new Response('', { status: 500 }),
    ) as unknown as typeof fetch
    expect(await countPromptTokens(config, { ...base, fetchImpl: fn })).toEqual(
      {
        tokens: 100,
        estimated: true,
      },
    )
  })
  it('falls back when offline without calling', async () => {
    const config = setup()
    const fn = vi.fn() as unknown as typeof fetch
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(await countPromptTokens(config, { ...base, fetchImpl: fn })).toEqual(
      {
        tokens: 100,
        estimated: true,
      },
    )
    expect(fn).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
  it('sends nothing when the notebook does not allow AI', async () => {
    const config = setup()
    const fn = vi.fn() as unknown as typeof fetch
    const r = await countPromptTokens(config, {
      ...base,
      allowedHere: false,
      fetchImpl: fn,
    })
    expect(r.estimated).toBe(true)
    expect(fn).not.toHaveBeenCalled()
  })
  it('sends nothing when AI is off or no key', async () => {
    const config = setup()
    writePref(AI_KEYS.enabled, false)
    const fn = vi.fn() as unknown as typeof fetch
    expect(
      (await countPromptTokens(config, { ...base, fetchImpl: fn })).estimated,
    ).toBe(true)
    expect(fn).not.toHaveBeenCalled()
  })
  it('sends nothing when the key is at its monthly limit', async () => {
    const config = setup()
    setKeyCap(listKeys()[0].id, 0)
    const fn = vi.fn() as unknown as typeof fetch
    const r = await countPromptTokens(readAiConfig(), {
      ...base,
      fetchImpl: fn,
    })
    expect(r.estimated).toBe(true)
    expect(config.candidates.length).toBeGreaterThan(0)
    expect(fn).not.toHaveBeenCalled()
  })
  it('sends nothing for a locked page', async () => {
    const config = setup()
    const fn = vi.fn() as unknown as typeof fetch
    const r = await countPromptTokens(config, {
      ...base,
      lockedBlocked: true,
      fetchImpl: fn,
    })
    expect(r.estimated).toBe(true)
    expect(fn).not.toHaveBeenCalled()
  })
  it('writes a row in the send log, with no text and no key', async () => {
    const config = setup()
    const fn = vi.fn(async () =>
      json({ input_tokens: 5 }),
    ) as unknown as typeof fetch
    await countPromptTokens(config, { ...base, fetchImpl: fn })
    const log = readSendLog()
    expect(log).toHaveLength(1)
    expect(log[0].feature).toBe('countTokens')
    expect(log[0].notebookId).toBe('n1')
    expect(JSON.stringify(log)).not.toContain('aaaaaaaa1111')
    expect(JSON.stringify(log)).not.toContain('aaaa')
  })
  it('providers without a count call use the guess and make no call', async () => {
    addKey('openai', 'GPT', 'sk-openai-aaaaaaaa2222')
    writePref(AI_KEYS.enabled, true)
    const config = {
      ...readAiConfig(),
      candidates: readAiConfig().candidates.filter((c) =>
        c.model.startsWith('gpt'),
      ),
    }
    const fn = vi.fn() as unknown as typeof fetch
    const r = await countPromptTokens(config, { ...base, fetchImpl: fn })
    expect(r).toEqual({ tokens: 100, estimated: true })
  })
})
