import { describe, expect, it } from 'vitest'
import { buildReport, featureGroup, fractionOf, toCsv } from './usageReport'
import type { SendEntry } from './sendLog'

const e = (o: Partial<SendEntry>): SendEntry => ({
  at: Date.UTC(2026, 10, 9, 8, 0),
  feature: 'prompt',
  host: 'api.anthropic.com',
  costUsd: 0.5,
  keyId: 'k1',
  model: 'm1',
  inputTokens: 100,
  outputTokens: 50,
  ...o,
})

describe('usage report', () => {
  it('groups features', () => {
    expect(featureGroup('storySoFar')).toBe('askBook')
    expect(featureGroup('latex')).toBe('convert')
    expect(featureGroup('cleanup')).toBe('cleanup')
    expect(featureGroup('whatever')).toBe('other')
  })

  it('totals and splits by key, model, feature and notebook', () => {
    const r = buildReport([
      e({}),
      e({ feature: 'skill', keyId: 'k2', model: 'm2', costUsd: 1.5 }),
      e({ notebookId: 'n1', costUsd: 0.25 }),
    ])
    expect(r.totalUsd).toBeCloseTo(2.25)
    expect(r.calls).toBe(3)
    expect(r.tokens).toBe(450)
    expect(r.byKey[0]).toMatchObject({ id: 'k2', calls: 1 })
    expect(r.byModel.map((s) => s.id)).toEqual(['m2', 'm1'])
    expect(r.byFeature.find((s) => s.id === 'prompts')?.calls).toBe(2)
    expect(r.byNotebook.find((s) => s.id === 'n1')?.costUsd).toBe(0.25)
  })

  it('bar fraction', () => {
    expect(fractionOf(1, 4)).toBe(0.25)
    expect(fractionOf(9, 4)).toBe(1)
    expect(fractionOf(0, 0)).toBe(0)
    expect(fractionOf(1, 0)).toBe(1)
  })

  it('CSV has no content, quotes cells and guards formulas', () => {
    const csv = toCsv(
      [e({ notebookId: 'n1' })],
      {
        key: () => '=cmd,"x"',
        notebook: () => 'Bio',
        cost: (u) => u * 90,
      },
      'INR',
    )
    const [head, row] = csv.split('\r\n')
    expect(head).toBe(
      'time_utc,feature,model,key,notebook,tokens_in,tokens_out,cost_INR',
    )
    expect(row).toBe(
      '2026-11-09T08:00:00.000Z,prompt,m1,"\'=cmd,""x""",Bio,100,50,45.0000',
    )
  })
})
