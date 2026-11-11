/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import type { AiConfig } from '../../ai/route'
import { MODELS } from '../../ai/models'
import { AiError } from '../../ai/provider'
import { createTestDb } from '../../core/testing'
import { aiReadPage, cleanOcrText, estimateAiOcrCost } from './aiOcr'

const model = MODELS.find((m) => m.vision !== false)!
const config = (over: Partial<AiConfig> = {}): AiConfig => ({
  enabled: true,
  capUsd: 5,
  candidates: [],
  provider: model.provider,
  model: model.id,
  ...over,
})

describe('AI reading of scanned pages', () => {
  it('shows a cost that grows with the pages and is zero for none', () => {
    const one = estimateAiOcrCost(config(), 1)
    expect(one).toBeGreaterThan(0)
    expect(estimateAiOcrCost(config(), 10)).toBeCloseTo(one * 10, 10)
    expect(estimateAiOcrCost(config(), 0)).toBe(0)
  })

  it('cleans the answer', () => {
    expect(cleanOcrText('```text\nHello\nworld\n```')).toBe('Hello\nworld')
    expect(cleanOcrText('  plain  ')).toBe('plain')
  })

  it('does not send anything when AI is off or has no key', async () => {
    let sent = 0
    const fetchSpy = globalThis.fetch
    globalThis.fetch = (() => {
      sent++
      return Promise.reject(new Error('should not be called'))
    }) as typeof fetch
    try {
      const db = createTestDb()
      await db.open()
      const image = {
        mediaType: 'image/png' as const,
        data: 'AAAA',
        width: 10,
        height: 10,
      }
      await expect(
        aiReadPage(config({ enabled: false }), image, {
          db,
          pageId: '',
        }),
      ).rejects.toBeInstanceOf(AiError)
      expect(sent).toBe(0)
    } finally {
      globalThis.fetch = fetchSpy
    }
  })
})
