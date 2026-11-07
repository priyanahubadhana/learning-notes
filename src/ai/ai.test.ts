/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writePref } from '../app/uiPrefs'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { aiBatches, keepAiResult, removeAiResult } from '../capture/importNotes'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { addBlocks } from '../core/blockBulk'
import {
  AI_KEYS,
  actionPrompt,
  applyCards,
  applyKeyPoints,
  applySummary,
  blocker,
  gatherText,
  parseCards,
  readAiConfig,
  runAi,
} from './aiRun'
import { forgetKey, getKey, maskKey, setKey } from './keyStore'
import { AiError, PROVIDERS, reasonFor } from './provider'
import { complete } from './providers'
import { costOf, monthKey, readUsage, recordUsage, withinCap } from './usage'

/** A fake fetch that records the request and answers with `body`. */
function fakeFetch(body: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }) as unknown as typeof fetch
  return { fn, calls }
}

beforeEach(() => localStorage.clear())

describe('providers', () => {
  it('Anthropic: browser-access header, key header, usage read back', async () => {
    const { fn, calls } = fakeFetch({
      content: [{ type: 'text', text: '## Key points\n- a' }],
      usage: { input_tokens: 120, output_tokens: 30 },
    })
    const r = await complete({
      provider: 'anthropic',
      key: 'sk-ant-secretsecret',
      model: 'claude-haiku-5-5',
      prompt: 'hi',
      maxTokens: 100,
      fetchImpl: fn,
    })
    expect(r).toEqual({
      text: '## Key points\n- a',
      inputTokens: 120,
      outputTokens: 30,
    })
    const h = calls[0].init.headers as Record<string, string>
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages')
    expect(h['anthropic-dangerous-direct-browser-access']).toBe('true')
    expect(h['x-api-key']).toBe('sk-ant-secretsecret')
    expect(calls[0].init.credentials).toBe('omit')
    expect(JSON.parse(String(calls[0].init.body)).max_tokens).toBe(100)
  })

  it('OpenAI-style providers use Bearer and the chat endpoint', async () => {
    const { fn, calls } = fakeFetch({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    })
    for (const provider of ['openai', 'gemini'] as const) {
      const r = await complete({
        provider,
        key: 'key-1234567890',
        model: 'm',
        prompt: 'p',
        maxTokens: 10,
        fetchImpl: fn,
      })
      expect(r.text).toBe('ok')
    }
    expect(calls[0].url).toBe('https://api.openai.com/v1/chat/completions')
    expect(calls[1].url).toContain('generativelanguage.googleapis.com')
    expect(
      (calls[0].init.headers as Record<string, string>).authorization,
    ).toBe('Bearer key-1234567890')
  })

  it('explains failures in plain words and never shows the key', async () => {
    const { fn } = fakeFetch({ error: 'x' }, 401)
    const err = await complete({
      provider: 'anthropic',
      key: 'sk-ant-secretsecret',
      model: 'm',
      prompt: 'p',
      maxTokens: 1,
      fetchImpl: fn,
    }).catch((e) => e)
    expect(err).toBeInstanceOf(AiError)
    expect(err.message).toBe('the key was refused')
    expect(String(err.message)).not.toContain('secret')
    expect(reasonFor(429)).toMatch(/credit/)
    const down = (async () => {
      throw new TypeError('network')
    }) as unknown as typeof fetch
    await expect(
      complete({
        provider: 'openai',
        key: 'k'.repeat(10),
        model: 'm',
        prompt: 'p',
        maxTokens: 1,
        fetchImpl: down,
      }),
    ).rejects.toThrow('no connection')
  })

  it('only the three listed hosts exist (the CSP lists exactly these)', () => {
    expect(Object.values(PROVIDERS).map((p) => p.host)).toEqual([
      'api.anthropic.com',
      'api.openai.com',
      'generativelanguage.googleapis.com',
    ])
  })
})

describe('key store', () => {
  it('keeps the key on the device, masked, forgettable, and refuses junk', () => {
    expect(setKey('anthropic', ' sk-ant-1234567890abcd ')).toBe(true)
    expect(getKey('anthropic')).toBe('sk-ant-1234567890abcd')
    expect(maskKey(getKey('anthropic'))).toBe('sk-…abcd')
    expect(getKey('openai')).toBe('')
    expect(setKey('openai', 'short')).toBe(false)
    expect(setKey('openai', 'has a space in it')).toBe(false)
    forgetKey('anthropic')
    expect(getKey('anthropic')).toBe('')
  })
})

describe('usage and the monthly cap', () => {
  it('adds up this month, starts over next month, and stops at the cap', () => {
    const nov = new Date(2026, 10, 6)
    recordUsage('anthropic', 10_000_000, 1_000_000, nov)
    expect(readUsage(nov).costUsd).toBeCloseTo(
      costOf('anthropic', 10_000_000, 1_000_000),
    )
    expect(readUsage(nov).month).toBe(monthKey(nov))
    expect(readUsage(new Date(2026, 11, 1)).costUsd).toBe(0)
    // $1.50 used; a call that could cost about $0.005 fits under $2, not under $1.502.
    expect(withinCap('anthropic', 'x'.repeat(400), 10_000, 2, nov)).toBe(true)
    expect(withinCap('anthropic', 'x'.repeat(400), 10_000, 1.502, nov)).toBe(
      false,
    )
  })
})

describe('actions', () => {
  let db: LearningNotesDB
  let ws: string
  beforeEach(async () => {
    db = createTestDb()
    await db.open()
    ws = (await getOrCreateDefaultWorkspace(db)).id
  })
  afterEach(() => db.close())

  const turnOn = () => {
    writePref(AI_KEYS.enabled, true)
    setKey('anthropic', 'sk-ant-1234567890abcd')
  }

  it('is off by default and says what is missing', () => {
    expect(readAiConfig().enabled).toBe(false)
    expect(blocker(readAiConfig(), true)).toBe('notReady')
    turnOn()
    expect(blocker(readAiConfig(), false)).toBe('allowOff')
    expect(blocker(readAiConfig(), true)).toBeNull()
    expect(readAiConfig().model).toBe(PROVIDERS.anthropic.defaultModel)
  })

  it('refuses before any call when off, empty, or over the cap', async () => {
    const { fn, calls } = fakeFetch({})
    await expect(runAi(readAiConfig(), 'summary', 'text', fn)).rejects.toThrow()
    turnOn()
    await expect(runAi(readAiConfig(), 'summary', '   ', fn)).rejects.toThrow()
    writePref(AI_KEYS.cap, 0)
    await expect(runAi(readAiConfig(), 'summary', 'text', fn)).rejects.toThrow(
      /cap/,
    )
    expect(calls).toHaveLength(0)
  })

  it('sends only the chosen text, records usage, returns the answer', async () => {
    turnOn()
    const { fn, calls } = fakeFetch({
      content: [{ type: 'text', text: 'A short summary.' }],
      usage: { input_tokens: 50, output_tokens: 20 },
    })
    const r = await runAi(readAiConfig(), 'summary', 'The page words.', fn)
    expect(r.text).toBe('A short summary.')
    const sent = JSON.parse(String(calls[0].init.body)).messages[0].content
    expect(sent).toContain('The page words.')
    expect(sent).toBe(actionPrompt('summary', 'The page words.'))
    expect(readUsage().inputTokens).toBe(50)
  })

  it('applies a summary, key points and approved cards as AI-made content with one batch each', async () => {
    const nb = await createNotebook(db, ws, 'N')
    const page = await createPage(db, nb.id, null, 'Page')
    await addBlocks(db, page.id, [
      {
        type: 'paragraph',
        content: { text: [{ type: 'text', text: 'Own words', styles: {} }] },
      },
    ])
    const s = await applySummary(db, page, 'One. Two.')
    const k = await applyKeyPoints(db, ws, page, '## Key points\n- a\n- b')
    const cards = parseCards(
      '## Cards\nQ: Why?\nA: Because.\nCloze: The {{sky}} is blue.',
    )
    expect(cards).toHaveLength(2)
    const c = await applyCards(db, ws, page, [cards[0]])
    expect(c.cards).toBe(1)
    const batches = await aiBatches(db, page.id)
    expect(new Set(batches.map((b) => b.batchId))).toEqual(
      new Set([s.batchId, k.batchId, c.batchId]),
    )
    const blocks = await listBlocks(db, page.id)
    expect(blocks.filter((b) => b.source === 'ai')).toHaveLength(
      blocks.length - 1,
    )
    expect(parseCards('nothing here')).toEqual([])
  })

  it('applying then removing a result leaves the page as it was; Keep as mine clears the marks', async () => {
    const nb = await createNotebook(db, ws, 'N')
    const page = await createPage(db, nb.id, null, 'Page')
    await addBlocks(db, page.id, [
      {
        type: 'paragraph',
        content: { text: [{ type: 'text', text: 'Own words', styles: {} }] },
      },
    ])
    const live = async () =>
      JSON.stringify(
        (await listBlocks(db, page.id)).map((b) => [b.id, b.type, b.content]),
      )
    const before = await live()
    const s = await applySummary(db, page, 'One. Two.')
    expect(await live()).not.toBe(before)
    await removeAiResult(db, page.id, s.batchId)
    expect(await live()).toBe(before)

    const k = await applyKeyPoints(db, ws, page, '## Key points\n- a\n- b')
    const kept = await keepAiResult(db, page.id, k.batchId)
    expect(kept.length).toBeGreaterThan(0)
    const blocks = await listBlocks(db, page.id)
    expect(blocks.filter((b) => b.source === 'ai')).toHaveLength(0)
    expect(blocks.filter((b) => b.batchId)).toHaveLength(0)
    expect(await aiBatches(db, page.id)).toEqual([])
    // Kept notes count as the person's own again.
    expect(await gatherText(db, page, 'summary')).toContain('Key points')
  })

  it('collects the page text without earlier AI results', async () => {
    const nb = await createNotebook(db, ws, 'N')
    const page = await createPage(db, nb.id, null, 'Page')
    await addBlocks(db, page.id, [
      {
        type: 'paragraph',
        content: { text: [{ type: 'text', text: 'Mine', styles: {} }] },
      },
    ])
    await addBlocks(
      db,
      page.id,
      [
        {
          type: 'paragraph',
          content: { text: [{ type: 'text', text: 'Theirs', styles: {} }] },
        },
      ],
      { source: 'ai', batchId: 'b' },
    )
    expect(await gatherText(db, page, 'summary')).toBe('Mine')
  })
})
