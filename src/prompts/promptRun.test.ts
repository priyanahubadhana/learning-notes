/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { formatAmount } from '../ai/costCurrency'
import { addKey } from '../ai/keyStore'
import { AI_KEYS, readAiConfig } from '../ai/route'
import { writePref } from '../app/uiPrefs'
import { newPrompt } from './promptModel'
import {
  ANSWER_FORMAT,
  composePrompt,
  configFor,
  costLine,
  estimateCost,
  runPrompt,
} from './promptRun'

beforeEach(() => {
  localStorage.clear()
  writePref(AI_KEYS.enabled, true)
})

const item = { ...newPrompt('prompt'), name: 'Q', text: 'Summarise.' }

describe('cost before running', () => {
  it('shows rupees and tokens for the first model, from the same price table', () => {
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    const config = readAiConfig()
    const prompt = composePrompt(item, 'x'.repeat(4000))
    expect(prompt).toContain(ANSWER_FORMAT)
    const c = estimateCost(config, prompt, 2000)
    // Haiku 5.5: $0.1 in, $0.5 out per million tokens; rate 90 INR per USD.
    expect(c.inputTokens).toBe(Math.ceil(prompt.length / 4))
    expect(c.usd).toBeCloseTo((c.inputTokens * 0.1 + 2000 * 0.5) / 1e6, 8)
    expect(c.amount).toBeCloseTo(c.usd * 90, 8)
    const line = costLine(c)
    expect(line).toContain('₹')
    expect(line).toContain('Claude Haiku 5.5')
    expect(line).toContain('2,000')
  })

  it('uses the rate from the pref, and says "under" for almost nothing', () => {
    writePref('ai.inrPerUsd', 100) // older pref still read
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    const c = estimateCost(readAiConfig(), 'short', 10)
    expect(c.amount).toBeCloseTo(c.usd * 100, 10)
    expect(formatAmount(0.0001)).toContain('under')
    expect(formatAmount(12.5)).toContain('12.50')
  })
})

describe('preferred company and model', () => {
  it('switches to the preferred one only when its toggle is on and a key exists', () => {
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    addKey('gemini', 'Gemini', 'AIza-test-1234567890')
    const config = readAiConfig()
    const base = { ...item, provider: 'gemini' as const, model: '' }
    expect(configFor(config, base)).toBe(config)
    const on = configFor(config, { ...base, usePreferred: true })
    expect(on.provider).toBe('gemini')
    expect(on.candidates).toHaveLength(1)
    const noKey = configFor(config, {
      ...base,
      provider: 'openai',
      usePreferred: true,
    })
    expect(noKey).toBe(config)
  })
})

describe('running', () => {
  it('sends the prompt, the format and the text, and returns the answer', async () => {
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    let body = ''
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      body = String(init.body)
      return new Response(
        JSON.stringify({
          content: [{ type: 'text', text: 'Done.' }],
          usage: { input_tokens: 10, output_tokens: 2 },
        }),
        { status: 200 },
      )
    }) as typeof fetch
    const answer = await runPrompt(readAiConfig(), item, 'The cell text', {
      fetchImpl,
    })
    expect(answer).toBe('Done.')
    expect(body).toContain('The cell text')
    expect(body).toContain('Summarise.')
  })
})
