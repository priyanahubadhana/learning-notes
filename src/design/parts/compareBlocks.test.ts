import { describe, expect, it } from 'vitest'
import { compareBlocks, diffWords, foldRuns } from './compareBlocks'

const doc = (...t: string[]) => ({
  blocks: t.map((text, i) => ({ id: `b${i}`, text })),
})
const named = (...pairs: [string, string][]) => ({
  blocks: pairs.map(([id, text]) => ({ id, text })),
})

describe('compareBlocks', () => {
  it('S3-37 two identical versions have no changes', () => {
    const r = compareBlocks(doc('a', 'b'), doc('a', 'b'))
    expect(r.changes).toBe(0)
    expect(r.rows.every((x) => x.kind === 'same')).toBe(true)
  })
  it('marks added, removed and changed blocks', () => {
    const r = compareBlocks(
      named(['1', 'keep'], ['2', 'old words here'], ['3', 'gone']),
      named(['1', 'keep'], ['2', 'new words here'], ['4', 'fresh']),
    )
    const kinds = r.rows.map((x) => x.kind)
    expect(kinds).toContain('changed')
    expect(kinds).toContain('removed')
    expect(kinds).toContain('added')
    expect(r.changes).toBe(3)
  })
  it('changed blocks are compared word by word', () => {
    const w = diffWords('old words here', 'new words here')
    expect(w.before.filter((x) => x.mark === 'del').map((x) => x.t)).toEqual([
      'old',
    ])
    expect(w.after.filter((x) => x.mark === 'add').map((x) => x.t)).toEqual([
      'new',
    ])
  })
  it('a moved block counts once', () => {
    const r = compareBlocks(
      named(['a', 'A'], ['b', 'B'], ['c', 'C']),
      named(['b', 'B'], ['c', 'C'], ['a', 'A']),
    )
    expect(r.changes).toBe(1)
    expect(r.rows.filter((x) => x.moved)).toHaveLength(2)
  })
  it('one side empty: everything is added or removed', () => {
    expect(compareBlocks(doc(), doc('x', 'y')).changes).toBe(2)
    expect(compareBlocks(doc('x'), doc()).rows[0].kind).toBe('removed')
  })
  it('S3-33 a changed picture is marked as changed', () => {
    const r = compareBlocks(
      { blocks: [{ id: 'p', text: '', picture: 'v1' }] },
      { blocks: [{ id: 'p', text: '', picture: 'v2' }] },
    )
    expect(r.rows[0].kind).toBe('changed')
  })
  it('folds unchanged runs longer than 6', () => {
    const same = Array.from({ length: 8 }, (_, i) => `s${i}`)
    const r = compareBlocks(doc(...same, 'x'), doc(...same, 'y'))
    const items = foldRuns(r.rows)
    expect(items.some((i) => i.type === 'fold' && i.count === 8)).toBe(true)
    expect(
      foldRuns(compareBlocks(doc('a', 'b'), doc('a', 'b')).rows),
    ).toHaveLength(2)
  })
  it('2,000 blocks compare inside the time budget', () => {
    const a = doc(...Array.from({ length: 2000 }, (_, i) => `line ${i}`))
    const b = doc(
      ...Array.from({ length: 2000 }, (_, i) =>
        i % 50 === 0 ? `edit ${i}` : `line ${i}`,
      ),
    )
    const t0 = performance.now()
    const r = compareBlocks(a, b)
    expect(performance.now() - t0).toBeLessThan(1500)
    expect(r.changes).toBe(40)
  })
})
