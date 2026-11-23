import { describe, expect, it } from 'vitest'
import {
  compute,
  csvLine,
  isoWeek,
  parseTasks,
  render,
  weekRange,
} from './weekly-card.mjs'

const csv = `merged_at,phase,task,builder_model,helper_tokens,review_rounds,test_runs_green,test_runs_red,hours_start_to_merged,notes
2026-11-17T10:00+05:30,1A,A,sonnet,1000,2,,,2.0,"note, with comma"
2026-11-19T10:00+05:30,1A,B,sonnet,3000,1,,,4.0,
2026-11-10T10:00+05:30,1A,C,sonnet,9000,5,,,9.0,old week
`

describe('weekly card', () => {
  it('names the ISO week and its range', () => {
    expect(isoWeek(new Date(2026, 10, 23))).toBe('2026-W48')
    const r = weekRange('2026-W47')
    expect(r.from.toISOString().slice(0, 10)).toBe('2026-11-16')
    expect(r.to.toISOString().slice(0, 10)).toBe('2026-11-23')
  })

  it('reads quoted csv fields', () => {
    expect(csvLine('a,"b, c",d')).toEqual(['a', 'b, c', 'd'])
    expect(parseTasks(csv)[0].notes).toBe('note, with comma')
  })

  it('computes the eight numbers for the week only', () => {
    const n = compute({
      tasks: parseTasks(csv),
      issues: [
        {
          createdAt: '2026-11-18T00:00:00Z',
          labels: [{ name: 'bug' }, { name: 'scenario-gap' }],
        },
        { createdAt: '2026-11-18T00:00:00Z', labels: [{ name: 'bug' }] },
        { createdAt: '2026-11-18T00:00:00Z', labels: [{ name: 'idea' }] },
        { createdAt: '2026-10-01T00:00:00Z', labels: [{ name: 'bug' }] },
      ],
      shaky: 0,
      range: weekRange('2026-W47'),
    })
    expect(n).toHaveLength(8)
    expect(n[0][1]).toBe('2')
    expect(n[1][1]).toBe('3.0')
    expect(n[2][1]).toBe('1.5')
    expect(n[3][1]).toBe('2 (a scenario should have caught: 1)')
    expect(n[4][1]).toBe('not recorded')
    expect(n[5][1]).toBe('not recorded')
    expect(n[6][1]).toBe('0')
    expect(n[7][1]).toBe('2000')
  })

  it('an empty week says not recorded, not zero averages', () => {
    const n = compute({
      tasks: [],
      issues: [],
      shaky: 3,
      range: weekRange('2026-W47'),
    })
    expect(n[0][1]).toBe('0')
    expect(n[1][1]).toBe('not recorded')
    expect(n[6][1]).toBe('3')
  })

  it('renders an empty Owner line', () => {
    const text = render('2026-W47', [['A', '1', 'x']])
    expect(text).toMatch(/## Owner's line\n\n\(empty/)
  })
})
