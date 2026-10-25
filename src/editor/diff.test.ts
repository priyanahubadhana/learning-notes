import { describe, expect, it } from 'vitest'
import { assignOrders } from '../core/order'
import type { Block } from '../core/types'
import { createSnapshot, diffBlocks, type BlockDraft } from './diff'

const T = 1_700_000_000_000

const draft = (
  id: string,
  text: string,
  parentId: string | null = null,
): BlockDraft => ({ id, parentId, type: 'paragraph', content: { text } })

/** Saved records matching the drafts (siblings ordered as listed). */
function recordsFor(drafts: BlockDraft[]): Block[] {
  const keys = assignOrders(drafts.map(() => null))
  return drafts.map((d, i) => ({
    ...d,
    pageId: 'p1',
    order: keys[i],
    createdAt: T,
    updatedAt: T,
    deletedAt: null,
  }))
}

/** A page that was loaded with blocks a, b, c. */
function loaded() {
  const drafts = [draft('a', 'A'), draft('b', 'B'), draft('c', 'C')]
  const records = recordsFor(drafts)
  return { drafts, records, snapshot: createSnapshot(drafts, records) }
}

describe('diffBlocks', () => {
  it('finds no changes right after load', () => {
    const { drafts, snapshot } = loaded()
    const { changes } = diffBlocks(snapshot, drafts)
    expect(changes).toEqual({ upserts: [], deletes: [] })
  })

  it('saves only the edited block', () => {
    const { drafts, snapshot, records } = loaded()
    const edited = [drafts[0], draft('b', 'B changed'), drafts[2]]
    const { changes } = diffBlocks(snapshot, edited)
    expect(changes.deletes).toEqual([])
    expect(changes.upserts).toEqual([{ ...edited[1], order: records[1].order }])
  })

  it('a move rewrites only the moved block', () => {
    const { drafts, snapshot, records } = loaded()
    const [a, b, c] = drafts
    const { changes } = diffBlocks(snapshot, [c, a, b])
    expect(changes.upserts.map((u) => u.id)).toEqual(['c'])
    expect(changes.upserts[0].order < records[0].order).toBe(true)
  })

  it('nesting a block changes its parentId', () => {
    const { drafts, snapshot } = loaded()
    const [a, b, c] = drafts
    const { changes } = diffBlocks(snapshot, [a, { ...b, parentId: 'a' }, c])
    expect(changes.upserts).toHaveLength(1)
    expect(changes.upserts[0]).toMatchObject({ id: 'b', parentId: 'a' })
  })

  it('creates new blocks and deletes removed ones', () => {
    const { drafts, snapshot } = loaded()
    const [a, , c] = drafts
    const { changes } = diffBlocks(snapshot, [a, draft('new', 'N'), c])
    expect(changes.upserts.map((u) => u.id)).toEqual(['new'])
    expect(changes.deletes).toEqual(['b'])
  })

  it('does not save an untouched block that is not in the database', () => {
    // Empty page: the editor shows one empty line that was never saved.
    const start = [draft('empty', '')]
    const snapshot = createSnapshot(start, [])
    expect(diffBlocks(snapshot, start).changes.upserts).toEqual([])
    // ...and does not delete it if it disappears, since it was never saved.
    expect(diffBlocks(snapshot, []).changes.deletes).toEqual([])
    // Once edited, it is created.
    const typed = [draft('empty', 'hello')]
    expect(diffBlocks(snapshot, typed).changes.upserts).toHaveLength(1)
  })

  it('never deletes blocks hidden from the editor (e.g. unknown types)', () => {
    const shown = [draft('a', 'A'), draft('b', 'B')]
    const hidden: BlockDraft[] = [
      { id: 'mystery', parentId: null, type: 'unknown-type', content: {} },
      draft('mysteryChild', 'inside', 'mystery'),
    ]
    const records = recordsFor([...shown, ...hidden])
    // The editor only received (and so only reports) the shown blocks.
    const snapshot = createSnapshot(shown, records)

    const { changes } = diffBlocks(snapshot, [shown[0]]) // user deletes b
    expect(changes.deletes).toEqual(['b'])
    expect(changes.upserts).toEqual([])
  })

  it('the next snapshot makes a repeat diff empty', () => {
    const { drafts, snapshot } = loaded()
    const edited = [draft('c', 'C!'), drafts[0], draft('new', 'N')]
    const { next } = diffBlocks(snapshot, edited)
    expect(diffBlocks(next, edited).changes).toEqual({
      upserts: [],
      deletes: [],
    })
  })
})
