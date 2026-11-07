/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { writePref } from '../app/uiPrefs'
import { AI_KEYS, readAiConfig } from './aiRun'
import { setKey } from './keyStore'
import { imageTokens, type AiImage, type ProviderId } from './provider'
import { complete } from './providers'
import { readUsage, withinCap } from './usage'
import { cleanAnswer, runVision } from './vision'

const IMG: AiImage = {
  mediaType: 'image/png',
  data: 'iVBORw0KGgo',
  width: 300,
  height: 150,
}
const noWait = async () => {}

function seq(...answers: { body: unknown; status?: number }[]) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const a = answers[Math.min(calls.length - 1, answers.length - 1)]
    return new Response(JSON.stringify(a.body), { status: a.status ?? 200 })
  }) as unknown as typeof fetch
  return { fn, calls }
}
const sent = (c: { init: RequestInit }) => JSON.parse(String(c.init.body))
const base = {
  key: 'sk-ant-xxxxxxxx',
  model: 'm',
  prompt: 'read',
  maxTokens: 50,
}

beforeEach(() => localStorage.clear())

describe('vision input', () => {
  it('Anthropic gets a base64 image block before the text', async () => {
    const { fn, calls } = seq({
      body: {
        content: [{ type: 'text', text: 'नमस्ते hello' }],
        usage: { input_tokens: 150, output_tokens: 4 },
      },
    })
    const r = await complete({
      ...base,
      provider: 'anthropic',
      images: [IMG],
      fetchImpl: fn,
    })
    expect(r.text).toBe('नमस्ते hello')
    const content = sent(calls[0]).messages[0].content
    expect(content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo' },
    })
    expect(content[1]).toEqual({ type: 'text', text: 'read' })
    const headers = calls[0].init.headers as Record<string, string>
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  })

  it.each<ProviderId>(['openai', 'gemini'])(
    '%s gets a data: image_url part',
    async (p) => {
      const { fn, calls } = seq({
        body: { choices: [{ message: { content: 'x' } }] },
      })
      await complete({ ...base, provider: p, images: [IMG], fetchImpl: fn })
      const content = sent(calls[0]).messages[0].content
      expect(content[0]).toEqual({
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,iVBORw0KGgo' },
      })
      expect(content[1].text).toBe('read')
    },
  )

  it('text-only calls still send a plain string', async () => {
    const { fn, calls } = seq({
      body: { content: [{ type: 'text', text: 'ok' }] },
    })
    await complete({ ...base, provider: 'anthropic', fetchImpl: fn })
    expect(sent(calls[0]).messages[0].content).toBe('read')
  })
})

describe('retry with backoff', () => {
  it('retries 429 and 5xx, then succeeds', async () => {
    const { fn, calls } = seq(
      { body: {}, status: 429 },
      { body: {}, status: 503 },
      { body: { content: [{ type: 'text', text: 'ok' }] } },
    )
    const r = await complete({
      ...base,
      provider: 'anthropic',
      fetchImpl: fn,
      sleep: noWait,
    })
    expect(r.text).toBe('ok')
    expect(calls).toHaveLength(3)
  })
  it('does not retry a refused key', async () => {
    const { fn, calls } = seq({ body: {}, status: 401 })
    await expect(
      complete({ ...base, provider: 'openai', fetchImpl: fn, sleep: noWait }),
    ).rejects.toThrow('the key was refused')
    expect(calls).toHaveLength(1)
  })
  it('gives up after two retries', async () => {
    const { fn, calls } = seq({ body: {}, status: 500 })
    await expect(
      complete({ ...base, provider: 'gemini', fetchImpl: fn, sleep: noWait }),
    ).rejects.toThrow()
    expect(calls).toHaveLength(3)
  })
})

describe('image cost and the cap', () => {
  it('counts image tokens (w*h/750, fitted to 1568 px)', () => {
    expect(imageTokens(750, 100)).toBe(185)
    expect(imageTokens(3136, 3136)).toBe(imageTokens(1568, 1568))
  })
  it('the cap counts the picture', () => {
    expect(
      withinCap('k', 'anthropic', 'claude-haiku-5-5', 'hi', 10, 0.0002),
    ).toBe(true)
    const big = { ...IMG, width: 1568, height: 1568 }
    expect(
      withinCap(
        'k',
        'anthropic',
        'claude-haiku-5-5',
        'hi',
        10,
        0.0002,
        new Date(),
        [big],
      ),
    ).toBe(false)
  })
  it('runVision is blocked by the cap and makes no call', async () => {
    writePref(AI_KEYS.enabled, true)
    writePref(AI_KEYS.cap, 0)
    setKey('anthropic', 'sk-ant-xxxxxxxx')
    const { fn, calls } = seq({
      body: { content: [{ type: 'text', text: 'x' }] },
    })
    await expect(
      runVision(readAiConfig(), 'handwriting', IMG, fn),
    ).rejects.toThrow()
    expect(calls).toHaveLength(0)
  })
  it('runVision records usage and cleans the answer', async () => {
    writePref(AI_KEYS.enabled, true)
    setKey('anthropic', 'sk-ant-xxxxxxxx')
    const { fn } = seq({
      body: {
        content: [{ type: 'text', text: '$$\\frac{a}{b}$$' }],
        usage: { input_tokens: 200, output_tokens: 10 },
      },
    })
    const r = await runVision(readAiConfig(), 'latex', IMG, fn)
    expect(r.text).toBe('\\frac{a}{b}')
    expect(readUsage().inputTokens).toBe(200)
  })
  it('cleans fences and quotes', () => {
    expect(cleanAnswer('handwriting', '```\nhello\n```')).toBe('hello')
    expect(cleanAnswer('handwriting', '"hi"')).toBe('hi')
  })
})
