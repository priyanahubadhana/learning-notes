/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { writePref } from '../app/uiPrefs'
import {
  askPrompt,
  gatherParts,
  pdfChapters,
  readPartOf,
  sectionOfCfi,
  splitCitations,
  storyPrompt,
} from './bookAsk'
import { addKey, setKeyCap } from './keyStore'
import { stream } from './providers'
import { AI_KEYS, callAi, readAiConfig } from './route'
import { readSendLog } from './sendLog'
import { readKeyUsage } from './usage'

beforeEach(() => localStorage.clear())

/** A mocked SSE answer: each string becomes one `data:` line. */
function sse(lines: unknown[], opts: { hang?: boolean } = {}) {
  const enc = new TextEncoder()
  const calls: string[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push(String(init.body))
    const body = new ReadableStream<Uint8Array>({
      async start(c) {
        for (const l of lines) {
          c.enqueue(enc.encode(`event: x\ndata: ${JSON.stringify(l)}\n\n`))
        }
        if (!opts.hang) return c.close()
        init.signal?.addEventListener('abort', () =>
          c.error(new DOMException('aborted', 'AbortError')),
        )
      },
    })
    void url
    return new Response(body, { status: 200 })
  }) as unknown as typeof fetch
  return { fn, calls }
}

const claudeLines = [
  { type: 'message_start', message: { usage: { input_tokens: 40 } } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hel' } },
  { type: 'content_block_delta', delta: { type: 'text_delta', text: 'lo' } },
  { type: 'message_delta', usage: { output_tokens: 5 } },
  { type: 'message_stop' },
]

describe('book text', () => {
  const parts = [
    { cite: 'p. 1', at: 'pdf:1:0', text: 'one '.repeat(50) },
    { cite: 'p. 2', at: 'pdf:2:0', text: 'two '.repeat(50) },
    { cite: 'p. 3', at: 'pdf:3:0', text: 'three '.repeat(50) },
  ]
  it('marks each part and keeps the start (ask) or the end (story) when too long', () => {
    const all = gatherParts(parts)
    expect(all.cut).toBe(false)
    expect(all.text).toMatch(/^\[p\. 1\]\none/)
    expect(all.text).toContain('[p. 3]')
    const start = gatherParts(parts, false, 500)
    expect(start.cut).toBe(true)
    expect(start.parts[0].cite).toBe('p. 1')
    expect(start.text).not.toContain('[p. 3]')
    const end = gatherParts(parts, true, 500)
    expect(end.cut).toBe(true)
    expect(end.parts.at(-1)?.cite).toBe('p. 3')
    expect(end.text).not.toContain('[p. 1]')
  })
  it('the prompts carry the question and the citation rule', () => {
    expect(askPrompt('Why?', 'T')).toMatch(/\[p\. 12\][\s\S]*Question: Why\?/)
    expect(storyPrompt('T')).toMatch(/Do not guess/)
  })
  it('splits citations into links for known marks', () => {
    const p = splitCitations('A [p. 2] and B [ch. 9].', parts)
    expect(p).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'cite', cite: 'p. 2', at: 'pdf:2:0' },
      { kind: 'text', text: ' and B ' },
      { kind: 'cite', cite: 'ch. 9', at: undefined },
      { kind: 'text', text: '.' },
    ])
  })
  it('knows the reading position: EPUB section, PDF chapters, no spoilers', () => {
    expect(sectionOfCfi('epub:epubcfi(/6/8!/4/2,/1:0,/1:5)')).toBe(3)
    expect(sectionOfCfi('pdf:3:0')).toBeNull()
    expect(
      pdfChapters(
        [
          { title: 'A', page: 1, depth: 0 },
          { title: 'A.1', page: 2, depth: 1 },
          { title: 'B', page: 5, depth: 0 },
        ],
        9,
      ),
    ).toEqual([
      { title: 'A', from: 1, to: 4 },
      { title: 'B', from: 5, to: 9 },
    ])
    expect(readPartOf('abcdefghij', 4)).toBe('abcdef')
    expect(readPartOf('abcdefghij', undefined)).toBe('')
  })
})

describe('streaming', () => {
  it('Claude: pieces arrive in order, tokens from the stream', async () => {
    const { fn, calls } = sse(claudeLines)
    const got: string[] = []
    const r = await stream(
      {
        provider: 'anthropic',
        key: 'sk-ant-x',
        model: 'claude-haiku-5-5',
        prompt: 'p',
        maxTokens: 10,
        fetchImpl: fn,
      },
      (s) => got.push(s),
    )
    expect(got).toEqual(['Hel', 'lo'])
    expect(r).toMatchObject({
      text: 'Hello',
      inputTokens: 40,
      outputTokens: 5,
      stopped: false,
    })
    expect(JSON.parse(calls[0]).stream).toBe(true)
  })
  it('Gemini (OpenAI-style SSE) with usage', async () => {
    const { fn } = sse([
      { choices: [{ delta: { content: 'Hi ' } }] },
      { choices: [{ delta: { content: 'there' } }] },
      { choices: [], usage: { prompt_tokens: 7, completion_tokens: 2 } },
    ])
    const r = await stream(
      {
        provider: 'gemini',
        key: 'AIza',
        model: 'gemini-3.5-flash-lite',
        prompt: 'p',
        maxTokens: 10,
        fetchImpl: fn,
      },
      () => {},
    )
    expect(r).toMatchObject({
      text: 'Hi there',
      inputTokens: 7,
      outputTokens: 2,
    })
  })
  it('Stop keeps what came so far and still counts the cost', async () => {
    addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')
    writePref(AI_KEYS.enabled, true)
    const { fn } = sse(claudeLines.slice(0, 2), { hang: true })
    const ctrl = new AbortController()
    const r = await callAi(readAiConfig(), {
      prompt: 'question',
      maxTokens: 100,
      fetchImpl: fn,
      signal: ctrl.signal,
      onText: () => ctrl.abort(),
      log: { notebookId: 'nb1', feature: 'askBook' },
    })
    expect(r.stopped).toBe(true)
    expect(r.text).toBe('Hel')
    const key = readAiConfig().candidates[0].keyId
    expect(readKeyUsage(key).inputTokens).toBe(40)
    const log = readSendLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({
      notebookId: 'nb1',
      feature: 'askBook',
      host: 'api.anthropic.com',
    })
    // The log holds no content.
    expect(Object.keys(log[0]).sort()).toEqual(
      ['at', 'costUsd', 'feature', 'host', 'notebookId'].sort(),
    )
    expect(JSON.stringify(log)).not.toContain('question')
  })
  it('the cap blocks a streamed call before anything is sent', async () => {
    const k = addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')!
    setKeyCap(k.id, 0)
    writePref(AI_KEYS.enabled, true)
    const { fn, calls } = sse(claudeLines)
    await expect(
      callAi(readAiConfig(), {
        prompt: 'question',
        maxTokens: 100,
        fetchImpl: fn,
        onText: () => {},
      }),
    ).rejects.toThrow()
    expect(calls).toHaveLength(0)
    expect(readSendLog()).toHaveLength(0)
  })
})
